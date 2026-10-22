'use strict';
// The student's attempt: start or resume, read, save answers, submit, receipt, result (BUILD_PLAN §19.5).

const store = require('./store');
const clock = require('./clock');
const { withLock } = require('./locks');
const { AppError, validationError, notFound } = require('./errors');
const { newId, attemptCode, shuffle } = require('./ids');
const { TIMING } = require('./constants');
const { typeModule, isValidResponse } = require('./scoring');
const { totalMarks } = require('./questions');
const { getExam } = require('./examStore');
const { finishAttempt, closeIfOverdue, refreshAttempts, refreshAttempt } = require('./finalize');
const { examRoomView, receiptView, resultView } = require('./attemptViews');
const files = require('./attemptFiles');

const MAX_SHUFFLE_TRIES = 10;

/** The attempt, if it exists and belongs to this student. */
function ownAttempt(user, attemptId) {
  const attempt = store.findById('attempts', attemptId);
  if (!attempt) throw notFound('This attempt');
  if (attempt.userId !== user.id) throw new AppError('FORBIDDEN', "This isn't your attempt.");
  return attempt;
}

/** Shuffles; for lists that must never stay in the authored order (ordering, matching), tries again. */
function shuffledIds(ids, mustDiffer) {
  const differs = (order) => order.some((id, i) => id !== ids[i]);
  let order = shuffle(ids);
  for (let i = 0; mustDiffer && ids.length > 1 && !differs(order) && i < MAX_SHUFFLE_TRIES; i += 1) order = shuffle(ids);
  return order;
}

function buildOptionOrder(questions, shuffleOptions) {
  return Object.fromEntries(questions.flatMap((q) => {
    const rule = typeModule(q.type).shuffle;
    if (!rule || (!rule.always && !shuffleOptions)) return [];
    return [[q.id, shuffledIds(q.config[rule.list].map((item) => item.id), rule.always)]];
  }));
}

function checkConsent(exam, consent) {
  const errors = {};
  if (!consent || consent.terms !== true) errors['consent.terms'] = 'You need to agree to the platform terms';
  if (exam.proctoring.enabled && (!consent || consent.capture !== true)) errors['consent.capture'] = 'You need to agree to camera and screen capture';
  if (exam.proctoring.enabled && (!consent || consent.events !== true)) errors['consent.events'] = 'You need to agree to event recording';
  if (Object.keys(errors).length) throw validationError(errors, 'Consent is needed before starting.');
}

function newAttempt(user, exam, { consent, systemCheck }, attemptNo, nowMs) {
  const questions = exam.shuffleQuestions ? shuffle(exam.questions) : exam.questions;
  const deadlineMs = Math.min(nowMs + exam.durationMinutes * 60 * 1000, clock.ms(exam.closesAt));
  return {
    id: newId('at'), examId: exam.id, userId: user.id, code: attemptCode(), attemptNo,
    status: 'in_progress', submitReason: null,
    startedAt: clock.iso(nowMs), deadlineAt: clock.iso(deadlineMs), submittedAt: null, lastSeenAt: clock.iso(nowMs),
    questionOrder: questions.map((q) => q.id), optionOrder: buildOptionOrder(exam.questions, exam.shuffleOptions),
    answers: {}, resultVisibleAt: null,
    faceDetection: systemCheck && systemCheck.face === 'unavailable' ? 'unavailable' : 'ok',
    flagCount: 0, flagAllowance: 0, remainingSecAtEnd: null,
    score: null, maxScore: totalMarks(exam.questions), risk: { score: 0, level: 'low', reasons: [] },
    review: { status: 'pending', note: '', by: null, at: null },
    consent: { ...consent, at: clock.iso(nowMs) }, systemCheck: systemCheck || {},
    sensors: null, heartbeatGaps: [], eventSeqs: [], identityPhoto: null,
  };
}

function assertOpen(exam, nowMs) {
  const opens = clock.ms(exam.opensAt);
  const closes = clock.ms(exam.closesAt);
  if (exam.status !== 'published' || opens === null || closes === null || nowMs < opens || nowMs >= closes) {
    throw new AppError('EXAM_NOT_OPEN', "This exam isn't open right now.");
  }
}

/**
 * Starts an attempt, or returns the open one (resume).
 * @param {{ id: string }} user @param {string} examId @param {{ consent: object, systemCheck?: object }} input
 */
function startAttempt(user, examId, input) {
  // One start at a time per student and exam, so a double click can't create two attempts.
  return withLock(`start:${user.id}:${examId}`, async () => {
    const exam = getExam(examId);
    if (exam.status !== 'published') throw new AppError('EXAM_NOT_OPEN', "This exam isn't open right now.");
    const mine = await refreshAttempts(store.read('attempts').filter((a) => a.examId === examId && a.userId === user.id));
    const open = mine.find((a) => a.status === 'in_progress');
    if (open) return { ...examRoomView(open, exam, await files.readFlags(open)), resumed: true };
    const nowMs = clock.now();
    assertOpen(exam, nowMs);
    if (mine.length >= exam.maxAttempts) throw new AppError('NO_ATTEMPTS_LEFT', "You've used all your attempts for this exam.");
    checkConsent(exam, input.consent);
    const attempt = await store.insert('attempts', newAttempt(user, exam, input, mine.length + 1, nowMs));
    return { ...examRoomView(attempt, exam, []), resumed: false };
  });
}

/** attempts.get: state for resume. Finishes the attempt first if it is overdue. */
async function getAttempt(user, attemptId) {
  ownAttempt(user, attemptId);
  const attempt = await refreshAttempt(attemptId);
  return examRoomView(attempt, getExam(attempt.examId), await files.readFlags(attempt));
}

function inactiveError(attempt) {
  if (attempt.submitReason === 'deadline') return new AppError('TIME_UP', 'Time is up for this exam.');
  return new AppError('ATTEMPT_NOT_ACTIVE', 'This exam has already been submitted.');
}

/**
 * Saves one answer. A revision that isn't newer than the stored one changes nothing, so the
 * client's queue can retry safely and a slow old request can't overwrite a newer answer.
 */
function saveAnswer(user, attemptId, questionId, body) {
  return withLock(attemptId, async () => {
    const nowMs = clock.now();
    const exam = getExam(ownAttempt(user, attemptId).examId);
    const attempt = await closeIfOverdue(store.findById('attempts', attemptId), exam, nowMs);
    if (attempt.status !== 'in_progress') throw inactiveError(attempt);
    if (nowMs > clock.ms(attempt.deadlineAt) + TIMING.ANSWER_GRACE_MS) throw new AppError('TIME_UP', 'Time is up for this exam.');
    const question = attempt.questionOrder.includes(questionId) && exam.questions.find((q) => q.id === questionId);
    if (!question) throw notFound('This question');
    if (!isValidResponse(question, body.response)) throw new AppError('INVALID_RESPONSE', "That answer doesn't fit this question type.");
    const stored = attempt.answers[questionId];
    if (stored && body.revision <= stored.revision) return { applied: false, revision: stored.revision };
    const answer = { response: body.response, revision: body.revision, timeSpentSec: body.timeSpentSec, marked: body.marked, marksAwarded: null, savedAt: clock.iso(nowMs) };
    await store.updateById('attempts', attemptId, (a) => ({ ...a, answers: { ...a.answers, [questionId]: answer } }));
    return { applied: true, revision: body.revision };
  });
}

/** Idempotent: a second submit returns the same receipt. */
function submitAttempt(user, attemptId) {
  return withLock(attemptId, async () => {
    const exam = getExam(ownAttempt(user, attemptId).examId);
    const current = await closeIfOverdue(store.findById('attempts', attemptId), exam);
    const attempt = current.status === 'in_progress' ? await finishAttempt(current, exam, 'student', clock.now()) : current;
    return receiptView(attempt, exam);
  });
}

async function getReceipt(user, attemptId) {
  ownAttempt(user, attemptId);
  const attempt = await refreshAttempt(attemptId);
  return receiptView(attempt, getExam(attempt.examId));
}

async function getResult(user, attemptId) {
  ownAttempt(user, attemptId);
  const attempt = await refreshAttempt(attemptId);
  if (!attempt.resultVisibleAt) throw new AppError('RESULTS_NOT_AVAILABLE', "Results aren't available yet. Your examiner will publish them.");
  return resultView(attempt, getExam(attempt.examId));
}

module.exports = { ownAttempt, startAttempt, getAttempt, saveAnswer, submitAttempt, getReceipt, getResult };
