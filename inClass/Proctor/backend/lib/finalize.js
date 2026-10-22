'use strict';
// Ending an attempt, for every reason: the student submits, the deadline passes, the flag limit is
// reached, or an admin ends it. All four go through finishAttempt, so scoring, risk and result
// visibility are worked out in exactly one place.
//
// Overdue attempts are finished lazily: whenever an attempt is read and now > deadline + 30 s
// (BUILD_PLAN §19.5). No background job, nothing to keep running.

const store = require('./store');
const clock = require('./clock');
const { withLock } = require('./locks');
const { TIMING } = require('./constants');
const { scoreAnswer, round2 } = require('./scoring');
const { totalMarks } = require('./questions');
const { computeRisk, storedRisk } = require('./risk');
const { withVisibility } = require('./visibility');
const files = require('./attemptFiles');

/** Pure: the attempt with every answer scored and the attempt marked submitted. */
function scoredAttempt(attempt, exam, reason, endMs) {
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const answers = Object.fromEntries(Object.entries(attempt.answers).map(([qid, answer]) => {
    const question = byId.get(qid);
    return [qid, { ...answer, marksAwarded: question ? scoreAnswer(question, answer.response) : 0 }];
  }));
  const asked = attempt.questionOrder.map((qid) => byId.get(qid)).filter(Boolean);
  const score = round2(Object.values(answers).reduce((sum, a) => sum + a.marksAwarded, 0));
  return {
    ...attempt,
    answers,
    status: 'submitted',
    submitReason: reason,
    submittedAt: clock.iso(endMs),
    remainingSecAtEnd: Math.max(0, Math.round((clock.ms(attempt.deadlineAt) - endMs) / 1000)),
    score,
    maxScore: totalMarks(asked),
  };
}

/**
 * Finishes an attempt and saves it. The caller must hold the attempt's lock.
 * @param {object} attempt @param {object} exam
 * @param {'student'|'deadline'|'flag_limit'|'admin'} reason @param {number} endMs
 */
async function finishAttempt(attempt, exam, reason, endMs) {
  const scored = scoredAttempt(attempt, exam, reason, endMs);
  const { flags, captures, events } = await files.readAll(attempt);
  const risk = computeRisk({ attempt: scored, exam, flags, events, captures, nowMs: clock.now() });
  const next = withVisibility({ ...scored, risk: storedRisk(risk) }, exam, clock.iso());
  return store.updateById('attempts', attempt.id, () => next);
}

function isOverdue(attempt, nowMs) {
  return attempt.status === 'in_progress' && nowMs > clock.ms(attempt.deadlineAt) + TIMING.ANSWER_GRACE_MS;
}

/** Inside a lock: finishes the attempt as 'deadline' if it is overdue. The end time is the deadline. */
async function closeIfOverdue(attempt, exam, nowMs = clock.now()) {
  if (!isOverdue(attempt, nowMs)) return attempt;
  return finishAttempt(attempt, exam, 'deadline', clock.ms(attempt.deadlineAt));
}

/** Outside a lock: re-reads the attempt under its lock and finishes it if overdue. */
function refreshAttempt(attemptId) {
  return withLock(attemptId, async () => {
    const attempt = store.findById('attempts', attemptId);
    if (!attempt) return null;
    return closeIfOverdue(attempt, store.findById('exams', attempt.examId));
  });
}

/**
 * Finishes any overdue attempts in the list and returns the up-to-date records.
 * @param {readonly object[]} attempts
 */
async function refreshAttempts(attempts) {
  const nowMs = clock.now();
  const overdue = attempts.filter((a) => isOverdue(a, nowMs));
  await Promise.all(overdue.map((a) => refreshAttempt(a.id)));
  if (overdue.length === 0) return attempts;
  return attempts.map((a) => store.findById('attempts', a.id));
}

module.exports = { scoredAttempt, finishAttempt, closeIfOverdue, refreshAttempt, refreshAttempts, isOverdue };
