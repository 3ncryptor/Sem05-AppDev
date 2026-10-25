'use strict';
// Evidence images: upload from the student's main process, download for admins.
// Stored at screenshots/<Candidate_Name>/<Test_Name>/<webcam|screen>/<Candidate_Name>-<Test_Name>-<YYYY-MM-DD_HH-mm-ss>.jpg
// (attemptFiles.imagePath), in the server's local time. The API names files "<kind>/<name>.jpg".

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
const FILE_NAME = /^[\p{L}\p{M}\p{N}_-]{1,200}\.jpg$/u;
const MAX_SAME_SECOND = 99;

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-25T16:18:29.123Z" → "2026-10-25_21-48-29" in the server's time zone (no colons: Finder shows them as '/'). */
function localStamp(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/** "Asha_Rao-CLI_Apps-2026-10-25_21-48-29.jpg", or "…_2.jpg" when a file with that name is already there. */
async function freeFileName(attempt, kind, capturedAt) {
  const { candidate, test } = files.imageNames(attempt);
  const base = `${candidate}-${test}-${localStamp(capturedAt)}`;
  for (let n = 1; n <= MAX_SAME_SECOND; n += 1) {
    const name = n === 1 ? `${base}.jpg` : `${base}_${n}.jpg`;
    const taken = await fsp.access(files.imagePath(attempt, kind, name)).then(() => true, () => false);
    if (!taken) return name;
  }
  throw new AppError('VALIDATION_FAILED', 'Too many images in the same second.');
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
  const absolute = files.storedImagePath(capture.path);
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
    const name = await freeFileName(attempt, meta.kind, meta.capturedAt);
    const capture = {
      file: `${meta.kind}/${name}`,
      path: files.imageRelativePath(attempt, meta.kind, name),
      kind: meta.kind, seq: meta.seq, capturedAt: meta.capturedAt, reason: meta.reason,
      receivedAt: clock.iso(), bytes: body.length,
    };
    await saveCapture(attempt, capture, body);
    return { file: capture.file, duplicate: false };
  });
}

/**
 * Admin download. kind and file are checked against fixed patterns; the file is read from the path its
 * capture record was saved under (older records without one fall back to today's names), then guarded.
 */
async function readEvidence(attemptId, kind, fileName) {
  const attempt = store.findById('attempts', attemptId);
  if (!attempt || !EVIDENCE_KINDS.includes(kind) || !FILE_NAME.test(fileName)) throw notFound('This file');
  const capture = (await files.readCaptures(attempt)).find((c) => c.file === `${kind}/${fileName}`);
  if (!capture) throw notFound('This file');
  try {
    return await fsp.readFile(capture.path ? files.storedImagePath(capture.path) : files.imagePath(attempt, kind, fileName));
  } catch (err) {
    if (err.code === 'ENOENT') throw notFound('This file');
    throw err;
  }
}

module.exports = { uploadEvidence, readEvidence };
