'use strict';
// Student-facing shapes of an attempt. The rule they all follow: no key and no explanation
// leave the server unless attempt.resultVisibleAt is set (resultView).

const clock = require('./clock');
const store = require('./store');
const { studentQuestion } = require('./questions');
const { studentProctoring, effectiveMaxFlags } = require('./proctoring');
const { outcomeOf } = require('./scoring');
const { scoreSummary } = require('./visibility');

function answeredCount(attempt) {
  return Object.values(attempt.answers).filter((a) => a.response !== null && a.response !== undefined).length;
}

function studentAnswers(attempt) {
  return Object.fromEntries(Object.entries(attempt.answers).map(([qid, a]) => [
    qid, { response: a.response, revision: a.revision, timeSpentSec: a.timeSpentSec, marked: a.marked },
  ]));
}

function attemptSummary(attempt, exam) {
  return {
    id: attempt.id,
    code: attempt.code,
    examId: attempt.examId,
    attemptNo: attempt.attemptNo,
    status: attempt.status,
    submitReason: attempt.submitReason,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    serverNow: clock.iso(),
    flagCount: attempt.flagCount,
    maxFlags: effectiveMaxFlags(exam.proctoring, attempt),
    questionCount: attempt.questionOrder.length,
    answeredCount: answeredCount(attempt),
    resultVisible: Boolean(attempt.resultVisibleAt),
  };
}

/** The student's own flags for the C9c sheet (dismissed flags no longer count, so they're left out). */
function studentFlags(flags) {
  return flags.filter((f) => f.counted && !f.dismissed).map((f) => ({
    flagId: f.id, flagNo: f.flagNo, rules: f.rules, at: f.startedAt, questionId: f.questionId,
  }));
}

/** attempts.start / attempts.get: everything the exam room needs, nothing it mustn't see. */
function examRoomView(attempt, exam, flags, extra = {}) {
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  return {
    attempt: attemptSummary(attempt, exam),
    exam: { id: exam.id, code: exam.code, title: exam.title, durationMinutes: exam.durationMinutes },
    questions: attempt.questionOrder.map((qid) => byId.get(qid)).filter(Boolean).map((q) => studentQuestion(q, attempt.optionOrder)),
    answers: studentAnswers(attempt),
    proctoring: studentProctoring(exam.proctoring, attempt),
    flags: studentFlags(flags),
    ...extra,
  };
}

function receiptView(attempt, exam) {
  const user = store.findById('users', attempt.userId);
  return {
    code: attempt.code,
    attemptId: attempt.id,
    attemptNo: attempt.attemptNo,
    status: attempt.status,
    submitReason: attempt.submitReason,
    examId: exam.id,
    examTitle: exam.title,
    examCode: exam.code,
    studentName: user ? user.name : null,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    received: answeredCount(attempt),
    total: attempt.questionOrder.length,
    flagCount: attempt.flagCount,
    resultVisible: Boolean(attempt.resultVisibleAt),
    resultVisibility: exam.resultPolicy.visibility,
  };
}

/** One question in review mode: the student's answer, the key and the explanation. */
function reviewQuestion(question, attempt) {
  const answer = attempt.answers[question.id] || null;
  const response = answer ? answer.response : null;
  const marksAwarded = answer && typeof answer.marksAwarded === 'number' ? answer.marksAwarded : 0;
  return {
    ...studentQuestion(question, attempt.optionOrder),
    key: question.key,
    explanation: question.explanation,
    response,
    marksAwarded,
    result: outcomeOf(question, response, marksAwarded),
    marked: answer ? answer.marked : false,
    timeSpentSec: answer ? answer.timeSpentSec : 0,
  };
}

function reviewQuestions(attempt, exam) {
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  return attempt.questionOrder.map((qid) => byId.get(qid)).filter(Boolean).map((q) => reviewQuestion(q, attempt));
}

/** attempts.result: only called once resultVisibleAt is set. */
function resultView(attempt, exam) {
  return {
    attemptId: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    examCode: exam.code,
    submittedAt: attempt.submittedAt,
    submitReason: attempt.submitReason,
    resultVisibleAt: attempt.resultVisibleAt,
    resultsPublishedAt: exam.resultsPublishedAt,
    ...scoreSummary(attempt, exam),
    questions: reviewQuestions(attempt, exam),
  };
}

module.exports = { examRoomView, receiptView, resultView, reviewQuestions, answeredCount, attemptSummary };
