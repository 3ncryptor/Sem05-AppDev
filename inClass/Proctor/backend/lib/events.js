'use strict';
// Proctoring events in: attempts.events (urgent) and attempts.heartbeat (every 10 s).
// Both run the same ingest(), which dedupes on seq, runs the pure flag engine, writes
// events.jsonl + flags.json + the attempt, and ends the attempt at the flag limit.

const store = require('./store');
const clock = require('./clock');
const { withLock } = require('./locks');
const { AppError } = require('./errors');
const { TIMING } = require('./constants');
const { applyEvents } = require('./flags');
const { effectiveMaxFlags } = require('./proctoring');
const { getExam } = require('./examStore');
const { finishAttempt, closeIfOverdue } = require('./finalize');
const { ownAttempt } = require('./attempts');
const files = require('./attemptFiles');

/**
 * The event time: the client's timestamp (so events queued offline keep their real order and
 * spacing), but never before the attempt started and never in the future.
 */
function eventTime(clientTs, attempt, nowMs) {
  const t = clock.ms(clientTs);
  if (t === null) return nowMs;
  return Math.min(nowMs, Math.max(clock.ms(attempt.startedAt), t));
}

function freshEvents(attempt, events) {
  const seen = new Set(attempt.eventSeqs);
  return events.filter((e) => {
    if (seen.has(e.seq)) return false;
    seen.add(e.seq);
    return true;
  });
}

function canTakeEvents(attempt, nowMs) {
  if (attempt.status === 'in_progress') return true;
  return nowMs - clock.ms(attempt.submittedAt) <= TIMING.LATE_EVENT_MS;
}

function toEngineEvent(e, attempt, nowMs) {
  return {
    seq: e.seq, type: e.type, phase: e.phase || null, at: eventTime(e.clientTs, attempt, nowMs),
    receivedAt: clock.iso(nowMs), questionId: e.questionId || null, payload: e.payload || {}, source: 'client',
  };
}

/** Inside the attempt lock. @returns {Promise<{ attempt: object, accepted: number, warnings: object[] }>} */
async function ingest(attempt, exam, rawEvents, nowMs) {
  const fresh = freshEvents(attempt, rawEvents).map((e) => toEngineEvent(e, attempt, nowMs));
  if (fresh.length === 0) return { attempt, accepted: 0, warnings: [] };
  const active = attempt.status === 'in_progress';
  const flags = await files.readFlags(attempt);
  // Late events (after the end) are kept for the timeline but never flag anything.
  const result = active
    ? applyEvents({ attempt, proctoring: exam.proctoring, flags, events: fresh })
    : { flags, flagCount: attempt.flagCount, records: fresh.map((e) => ({ ...e, at: clock.iso(e.at), flagId: null })), warnings: [], limitReached: false };
  await files.appendEvents(attempt, result.records);
  if (result.flags !== flags) await files.writeFlags(attempt, result.flags);
  const faceOff = fresh.some((e) => e.type === 'face_detection_unavailable');
  const saved = await store.updateById('attempts', attempt.id, (a) => ({
    ...a,
    flagCount: result.flagCount,
    eventSeqs: [...a.eventSeqs, ...fresh.map((e) => e.seq)],
    faceDetection: faceOff ? 'unavailable' : a.faceDetection,
  }));
  const ended = result.limitReached ? await finishAttempt(saved, exam, 'flag_limit', nowMs) : saved;
  return { attempt: ended, accepted: fresh.length, warnings: result.warnings };
}

function forcedOf(attempt) {
  return attempt.status === 'in_progress' ? {} : { forced: { submitReason: attempt.submitReason } };
}

/** POST /attempts/:id/events → { accepted, warnings, forced? } */
function recordEvents(user, attemptId, events) {
  return withLock(attemptId, async () => {
    const nowMs = clock.now();
    const exam = getExam(ownAttempt(user, attemptId).examId);
    const attempt = await closeIfOverdue(store.findById('attempts', attemptId), exam, nowMs);
    if (!canTakeEvents(attempt, nowMs)) throw new AppError('ATTEMPT_NOT_ACTIVE', 'This exam has already ended.');
    const out = await ingest(attempt, exam, events, nowMs);
    return { accepted: out.accepted, warnings: out.warnings, ...forcedOf(out.attempt) };
  });
}

function withHeartbeat(attempt, sensors, nowMs) {
  if (attempt.status !== 'in_progress') return attempt;
  const silence = nowMs - clock.ms(attempt.lastSeenAt);
  // A gap is shown to admins and adds risk points; it is never a flag (the network may be at fault).
  const gaps = silence > TIMING.HEARTBEAT_GAP_MS
    ? [...attempt.heartbeatGaps, { from: attempt.lastSeenAt, to: clock.iso(nowMs), sec: Math.round(silence / 1000) }]
    : attempt.heartbeatGaps;
  return { ...attempt, lastSeenAt: clock.iso(nowMs), sensors: sensors || attempt.sensors, heartbeatGaps: gaps };
}

/** POST /attempts/:id/heartbeat → { serverNow, deadlineAt, status, flagCount, maxFlags, warnings, forced? } */
function heartbeat(user, attemptId, body) {
  return withLock(attemptId, async () => {
    const nowMs = clock.now();
    const exam = getExam(ownAttempt(user, attemptId).examId);
    await closeIfOverdue(store.findById('attempts', attemptId), exam, nowMs);
    const beat = await store.updateById('attempts', attemptId, (a) => withHeartbeat(a, body.sensors, nowMs));
    const events = body.events && canTakeEvents(beat, nowMs) ? body.events : [];
    const out = await ingest(beat, exam, events, nowMs);
    const attempt = out.attempt;
    return {
      serverNow: clock.iso(),
      deadlineAt: attempt.deadlineAt,
      status: attempt.status,
      submitReason: attempt.submitReason,
      flagCount: attempt.flagCount,
      maxFlags: effectiveMaxFlags(exam.proctoring, attempt),
      warnings: out.warnings,
      ...forcedOf(attempt),
    };
  });
}

module.exports = { recordEvents, heartbeat };
