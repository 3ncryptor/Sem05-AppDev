'use strict';
// Admin actions on one attempt (BUILD_PLAN §6.5, §19.5): the review detail, dismissing a flag,
// decisions, extend / end / resume, release. Every action is logged as an admin_* event.

const store = require('./store');
const clock = require('./clock');
const { withLock } = require('./locks');
const { AppError, notFound, validationError } = require('./errors');
const { getExam } = require('./examStore');
const { finishAttempt, closeIfOverdue, refreshAttempt } = require('./finalize');
const { computeRisk, storedRisk } = require('./risk');
const { effectiveMaxFlags } = require('./proctoring');
const { withVisibility, isHeld, scoreSummary } = require('./visibility');
const { reviewQuestions } = require('./attemptViews');
const { studentOf } = require('./live');
const files = require('./attemptFiles');

const MS_PER_MINUTE = 60 * 1000;

function loadAttempt(attemptId) {
  const attempt = store.findById('attempts', attemptId);
  if (!attempt) throw notFound('This attempt');
  return attempt;
}

function adminEvent(type, adminId, payload) {
  return { seq: null, at: clock.iso(), receivedAt: clock.iso(), type, phase: null, questionId: null, payload, flagId: null, source: 'admin', by: adminId };
}

async function rescoreRisk(attempt, exam) {
  const data = await files.readAll(attempt);
  const risk = computeRisk({ attempt, exam, ...data, nowMs: clock.now() });
  return store.updateById('attempts', attempt.id, (a) => ({ ...a, risk: storedRisk(risk) }));
}

function withOffset(startMs, item, key) {
  return { ...item, offsetSec: Math.round((clock.ms(item[key]) - startMs) / 1000) };
}

/** admin.attempts.get: everything the review console shows for one attempt. */
async function attemptDetail(attemptId) {
  loadAttempt(attemptId);
  const attempt = await refreshAttempt(attemptId);
  const exam = getExam(attempt.examId);
  const data = await files.readAll(attempt);
  const risk = computeRisk({ attempt, exam, ...data, nowMs: clock.now() });
  const startMs = clock.ms(attempt.startedAt);
  const { eventSeqs, ...rest } = attempt;
  return {
    attempt: { ...rest, maxFlags: effectiveMaxFlags(exam.proctoring, attempt), held: isHeld(attempt, exam), ...scoreSummary(attempt, exam) },
    student: studentOf(attempt),
    exam: { id: exam.id, code: exam.code, title: exam.title, durationMinutes: exam.durationMinutes, maxFlags: exam.proctoring.autoEnd.maxFlags, resultPolicy: exam.resultPolicy },
    identityPhoto: attempt.identityPhoto,
    flags: data.flags.map((f) => withOffset(startMs, f, 'startedAt')),
    events: data.events.map((e) => withOffset(startMs, e, 'at')),
    captures: data.captures.map((c) => withOffset(startMs, c, 'capturedAt')).toSorted((a, b) => a.offsetSec - b.offsetSec),
    risk,
    heartbeatGaps: risk.gaps,
    answers: reviewQuestions(attempt, exam),
  };
}

/** Dismissing a counted flag lowers the count. It never reopens an attempt that already ended. */
function dismissFlag(adminId, attemptId, flagId, note) {
  return withLock(attemptId, async () => {
    const attempt = loadAttempt(attemptId);
    const flags = await files.readFlags(attempt);
    const flag = flags.find((f) => f.id === flagId);
    if (!flag) throw notFound('This flag');
    if (flag.dismissed) return { flag, flagCount: attempt.flagCount };
    const dismissed = { ...flag, dismissed: { by: adminId, at: clock.iso(), note } };
    await files.writeFlags(attempt, flags.map((f) => (f.id === flagId ? dismissed : f)));
    await files.appendEvents(attempt, [adminEvent('flag_dismissed', adminId, { flagId, note })]);
    const saved = await store.updateById('attempts', attemptId, (a) => ({ ...a, flagCount: flag.counted ? Math.max(0, a.flagCount - 1) : a.flagCount }));
    const rescored = await rescoreRisk(saved, getExam(saved.examId));
    return { flag: dismissed, flagCount: rescored.flagCount, risk: rescored.risk };
  });
}

/** cleared / suspicious / disqualified need a note; pending (Undo) doesn't. A decision un-holds. */
function decide(adminId, attemptId, { status, note }) {
  if (status !== 'pending' && !note) throw validationError({ note: 'A note is needed for every decision' });
  return withLock(attemptId, async () => {
    const attempt = loadAttempt(attemptId);
    if (attempt.status !== 'submitted') throw new AppError('ATTEMPT_NOT_ACTIVE', 'This attempt is still in progress. End it first, or wait for it to finish.');
    const exam = getExam(attempt.examId);
    const review = { status, note: note || '', by: status === 'pending' ? null : adminId, at: status === 'pending' ? null : clock.iso() };
    const saved = await store.updateById('attempts', attemptId, (a) => withVisibility({ ...a, review }, exam, clock.iso()));
    return { review: saved.review, held: isHeld(saved, exam), resultVisible: Boolean(saved.resultVisibleAt), ...scoreSummary(saved, exam) };
  });
}

async function activeAttempt(attemptId) {
  const attempt = loadAttempt(attemptId);
  const exam = getExam(attempt.examId);
  const current = await closeIfOverdue(attempt, exam);
  if (current.status !== 'in_progress') throw new AppError('ATTEMPT_NOT_ACTIVE', 'This attempt has already ended.');
  return { attempt: current, exam };
}

async function extendLocked(adminId, attemptId, minutes, reason) {
  const { attempt } = await activeAttempt(attemptId);
  const deadlineAt = clock.iso(clock.ms(attempt.deadlineAt) + minutes * MS_PER_MINUTE);
  await files.appendEvents(attempt, [adminEvent('admin_extended', adminId, { minutes, reason, from: attempt.deadlineAt, to: deadlineAt })]);
  const saved = await store.updateById('attempts', attemptId, (a) => ({ ...a, deadlineAt }));
  return { attemptId, deadlineAt: saved.deadlineAt };
}

/** Adds minutes to the deadline. The student's timer jumps at the next heartbeat. */
function extendAttempt(adminId, attemptId, minutes, reason) {
  return withLock(attemptId, () => extendLocked(adminId, attemptId, minutes, reason));
}

/** "Extend everyone…" for a platform problem: every attempt still in progress. */
async function extendInProgress(adminId, examId, minutes, reason) {
  getExam(examId);
  const ids = store.read('attempts').filter((a) => a.examId === examId && a.status === 'in_progress').map((a) => a.id);
  const results = await Promise.all(ids.map((id) => withLock(id, () => extendLocked(adminId, id, minutes, reason).catch(() => null))));
  return { extended: results.filter(Boolean).length, attempts: results.filter(Boolean) };
}

/** Submits with reason 'admin'. The student sees it at the next heartbeat (forced). */
function endAttempt(adminId, attemptId, reason) {
  return withLock(attemptId, async () => {
    const { attempt, exam } = await activeAttempt(attemptId);
    await files.appendEvents(attempt, [adminEvent('admin_ended', adminId, { reason })]);
    const ended = await finishAttempt(attempt, exam, 'admin', clock.now());
    return { attemptId, status: ended.status, submitReason: ended.submitReason, remainingSecAtEnd: ended.remainingSecAtEnd };
  });
}

/** Reopens an attempt ended by flags or by an admin, with the time that was left and extra flags. */
function resumeAttempt(adminId, attemptId, extraFlags, reason) {
  return withLock(attemptId, async () => {
    const attempt = loadAttempt(attemptId);
    if (attempt.status !== 'submitted' || !['flag_limit', 'admin'].includes(attempt.submitReason)) {
      throw new AppError('ATTEMPT_NOT_ACTIVE', 'Only attempts ended by flags or by the examiner can be resumed.');
    }
    const nowMs = clock.now();
    const deadlineAt = clock.iso(nowMs + (attempt.remainingSecAtEnd || 0) * 1000);
    await files.appendEvents(attempt, [adminEvent('admin_resumed', adminId, { extraFlags, reason, deadlineAt })]);
    const saved = await store.updateById('attempts', attemptId, (a) => ({
      ...a, status: 'in_progress', submitReason: null, submittedAt: null, score: null, resultVisibleAt: null,
      deadlineAt, lastSeenAt: clock.iso(nowMs), remainingSecAtEnd: null, flagAllowance: (a.flagAllowance || 0) + extraFlags,
    }));
    return { attemptId, status: saved.status, deadlineAt: saved.deadlineAt, flagCount: saved.flagCount, maxFlags: effectiveMaxFlags(getExam(saved.examId).proctoring, saved) };
  });
}

/** Makes one submitted, not-held attempt's result visible now. */
function releaseResult(adminId, attemptId) {
  return withLock(attemptId, async () => {
    const attempt = loadAttempt(attemptId);
    const exam = getExam(attempt.examId);
    if (attempt.status !== 'submitted') throw new AppError('ATTEMPT_NOT_ACTIVE', 'This attempt is still in progress.');
    if (isHeld(attempt, exam)) throw new AppError('ATTEMPT_HELD', 'This result is held until you make a review decision.');
    const saved = await store.updateById('attempts', attemptId, (a) => ({ ...a, resultVisibleAt: a.resultVisibleAt || clock.iso() }));
    return { attemptId, resultVisibleAt: saved.resultVisibleAt };
  });
}

module.exports = { attemptDetail, dismissFlag, decide, extendAttempt, extendInProgress, endAttempt, resumeAttempt, releaseResult };
