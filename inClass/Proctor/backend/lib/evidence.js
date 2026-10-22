'use strict';
// Evidence images: upload from the student's main process, download for admins.
// Stored at evidence/<userId>/<attemptId>/<kind>/<capturedAt with dashes>_<seq padded to 4>.jpg

const fsp = require('node:fs/promises');
const path = require('node:path');
const store = require('./store');
const clock = require('./clock');
const { withLock } = require('./locks');
const { AppError, notFound, validationError } = require('./errors');
const { LIMITS, TIMING, EVIDENCE_KINDS } = require('./constants');
const { ownAttempt } = require('./attempts');
const files = require('./attemptFiles');

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const FILE_NAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z_\d{4,9}\.jpg$/;

/** "2026-10-25T10:15:30.123Z" → "2026-10-25T10-15-30Z" (colons aren't allowed in some file systems). */
function stamp(isoString) {
  return `${isoString.slice(0, 19).replace(/:/g, '-')}Z`;
}

function fileNameFor(capturedAt, seq) {
  return `${stamp(capturedAt)}_${String(seq).padStart(4, '0')}.jpg`;
}

/** Checks the bytes before anything touches the disk. */
function assertJpeg(body) {
  if (!Buffer.isBuffer(body) || body.length === 0) throw validationError({ body: 'Send the image bytes as image/jpeg' });
  if (body.length > LIMITS.EVIDENCE_BYTES) throw new AppError('PAYLOAD_TOO_LARGE', 'Images must be 1 MB or smaller.');
  if (!body.subarray(0, 3).equals(JPEG_MAGIC)) throw validationError({ body: 'This is not a JPEG image' });
}

/** A flag photo belongs to the flag that started just before it. */
function attachToFlag(flags, capture) {
  const at = clock.ms(capture.capturedAt);
  const candidates = flags.filter((f) => {
    const started = clock.ms(f.startedAt);
    return at >= started - TIMING.INCIDENT_MERGE_MS && at - started <= TIMING.FLAG_CAPTURE_MS;
  });
  const target = candidates[candidates.length - 1];
  if (!target) return flags;
  return flags.map((f) => (f.id === target.id ? { ...f, captures: [...f.captures, capture.file] } : f));
}

async function saveCapture(attempt, capture, body) {
  const absolute = files.attemptPath(attempt, capture.kind, path.basename(capture.file));
  await fsp.mkdir(path.dirname(absolute), { recursive: true });
  await store.writeFileAtomic(absolute, body);
  await files.writeCaptures(attempt, [...(await files.readCaptures(attempt)), capture]);
  if (capture.reason === 'flag') {
    const flags = await files.readFlags(attempt);
    const next = attachToFlag(flags, capture);
    if (next !== flags) await files.writeFlags(attempt, next);
  }
  if (capture.kind === 'identity') {
    await store.updateById('attempts', attempt.id, (a) => ({ ...a, identityPhoto: capture.file }));
  }
}

/**
 * Idempotent on (kind, seq): a retried upload returns the first file and writes nothing.
 * Uploads are allowed after submit, because the worker keeps sending until its manifest is empty.
 * @param {{ id: string }} user @param {string} attemptId
 * @param {{ kind: string, seq: number, capturedAt: string, reason: string }} meta @param {Buffer} body
 */
function uploadEvidence(user, attemptId, meta, body) {
  assertJpeg(body);
  return withLock(attemptId, async () => {
    const attempt = ownAttempt(user, attemptId);
    const existing = (await files.readCaptures(attempt)).find((c) => c.kind === meta.kind && c.seq === meta.seq);
    if (existing) return { file: existing.file, duplicate: true };
    const capture = {
      file: `${meta.kind}/${fileNameFor(meta.capturedAt, meta.seq)}`,
      kind: meta.kind, seq: meta.seq, capturedAt: meta.capturedAt, reason: meta.reason,
      receivedAt: clock.iso(), bytes: body.length,
    };
    await saveCapture(attempt, capture, body);
    return { file: capture.file, duplicate: false };
  });
}

/** Admin download. kind and file are checked against fixed patterns, then the path is guarded. */
async function readEvidence(attemptId, kind, fileName) {
  const attempt = store.findById('attempts', attemptId);
  if (!attempt || !EVIDENCE_KINDS.includes(kind) || !FILE_NAME.test(fileName)) throw notFound('This file');
  try {
    return await fsp.readFile(files.attemptPath(attempt, kind, fileName));
  } catch (err) {
    if (err.code === 'ENOENT') throw notFound('This file');
    throw err;
  }
}

module.exports = { uploadEvidence, readEvidence, fileNameFor, stamp };
