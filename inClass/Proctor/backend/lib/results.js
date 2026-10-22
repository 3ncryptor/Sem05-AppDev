'use strict';
// Results for admins (A11: list, publish with dry run, CSV) and students (C16, C17), plus admin analytics (A12).

const store = require('./store');
const clock = require('./clock');
const { getExam } = require('./examStore');
const { refreshAttempts } = require('./finalize');
const { isHeld, syncExam, scoreSummary } = require('./visibility');
const { studentOf } = require('./live');
const { examAnalytics, studentAnalytics } = require('./analytics');
const files = require('./attemptFiles');

function heldReason(attempt, exam) {
  return isHeld(attempt, exam) ? 'auto-ended, review pending' : null;
}

function resultRow(attempt, exam) {
  return {
    attemptId: attempt.id, code: attempt.code, student: studentOf(attempt), status: attempt.status,
    submitReason: attempt.submitReason, submittedAt: attempt.submittedAt, ...scoreSummary(attempt, exam),
    flagCount: attempt.flagCount, risk: attempt.risk, review: attempt.review,
    held: isHeld(attempt, exam), heldReason: heldReason(attempt, exam), resultVisible: Boolean(attempt.resultVisibleAt),
  };
}

async function examAttempts(examId) {
  return refreshAttempts(store.read('attempts').filter((a) => a.examId === examId));
}

/** admin.results.list */
async function listResults(examId) {
  const exam = getExam(examId);
  const attempts = await examAttempts(examId);
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const rows = attempts.map((a) => resultRow(a, exam)).toSorted((a, b) => a.student.rollNo.localeCompare(b.student.rollNo));
  return {
    exam: { id: exam.id, title: exam.title, visibility: exam.resultPolicy.visibility, passPercent: exam.resultPolicy.passPercent, holdAutoEnded: exam.resultPolicy.holdAutoEnded, resultsPublishedAt: exam.resultsPublishedAt },
    pipeline: {
      submitted: submitted.length,
      reviewed: submitted.filter((a) => a.review.status !== 'pending').length,
      waiting: submitted.filter((a) => isHeld(a, exam)).length,
      ready: submitted.filter((a) => !isHeld(a, exam)).length,
      visible: submitted.filter((a) => a.resultVisibleAt).length,
    },
    rows,
  };
}

/** admin.results.publish: dryRun gives the counts for the dialog; otherwise publishes. */
async function publishResults(examId, dryRun) {
  const exam = getExam(examId);
  const submitted = (await examAttempts(examId)).filter((a) => a.status === 'submitted');
  const ready = submitted.filter((a) => !isHeld(a, exam));
  const outcomes = ready.map((a) => scoreSummary(a, exam).outcome);
  const counts = {
    willPublish: ready.length,
    held: submitted.length - ready.length,
    outcomes: {
      passed: outcomes.filter((o) => o === 'Passed').length,
      notPassed: outcomes.filter((o) => o === 'Not passed').length,
      disqualified: outcomes.filter((o) => o === 'Disqualified').length,
    },
    windowOpen: clock.ms(exam.closesAt) !== null && clock.now() < clock.ms(exam.closesAt),
    alreadyPublishedAt: exam.resultsPublishedAt,
  };
  if (dryRun) return { dryRun: true, ...counts };
  const nowIso = clock.iso();
  const saved = await store.updateById('exams', examId, (e) => ({ ...e, resultsPublishedAt: e.resultsPublishedAt || nowIso, updatedAt: nowIso }));
  await syncExam(saved);
  return { dryRun: false, ...counts, resultsPublishedAt: saved.resultsPublishedAt };
}

/** Spreadsheet apps run cells that start with = + - @ as formulas, so those get a leading quote. */
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const CSV_HEADER = ['rollNo', 'name', 'status', 'submitReason', 'score', 'maxScore', 'percent', 'outcome', 'flags', 'riskScore', 'riskLevel', 'review', 'resultVisible', 'submittedAt'];

/** admin.results.csv */
async function resultsCsv(examId) {
  const { rows } = await listResults(examId);
  const lines = rows.map((r) => [
    r.student.rollNo, r.student.name, r.status, r.submitReason, r.score, r.maxScore, r.percent, r.outcome,
    r.flagCount, r.risk.score, r.risk.level, r.review.status, r.resultVisible, r.submittedAt,
  ].map(csvCell).join(','));
  return [CSV_HEADER.join(','), ...lines].join('\r\n');
}

/** admin.analytics */
async function analyticsFor(examId) {
  const exam = getExam(examId);
  const attempts = await examAttempts(examId);
  const flagLists = await Promise.all(attempts.map((a) => files.readFlags(a)));
  const flagsByAttempt = new Map(attempts.map((a, i) => [a.id, flagLists[i]]));
  return examAnalytics({ exam, attempts, flagsByAttempt });
}

/** me.attempts: newest first; scores only when the result is visible. */
async function myAttemptList(user) {
  const attempts = await refreshAttempts(store.read('attempts').filter((a) => a.userId === user.id));
  const rows = attempts.map((a) => {
    const exam = store.findById('exams', a.examId);
    const visible = Boolean(a.resultVisibleAt);
    const summary = visible ? scoreSummary(a, exam) : { score: null, maxScore: null, percent: null, outcome: null, passPercent: exam.resultPolicy.passPercent };
    return {
      id: a.id, code: a.code, examId: a.examId, examTitle: exam.title, examCode: exam.code, attemptNo: a.attemptNo,
      status: a.status, submitReason: a.submitReason, startedAt: a.startedAt, deadlineAt: a.deadlineAt, submittedAt: a.submittedAt,
      resultVisible: visible, resultVisibility: exam.resultPolicy.visibility, ...summary,
    };
  });
  return { attempts: rows.toSorted((a, b) => b.startedAt.localeCompare(a.startedAt)) };
}

/** me.analytics */
async function myAnalytics(user) {
  const all = store.read('attempts');
  const mine = await refreshAttempts(all.filter((a) => a.userId === user.id));
  const examsById = new Map(store.read('exams').map((e) => [e.id, e]));
  const classByExam = all.filter((a) => a.status === 'submitted')
    .reduce((m, a) => m.set(a.examId, [...(m.get(a.examId) || []), a]), new Map());
  return studentAnalytics({ mine, examsById, classByExam });
}

module.exports = { listResults, publishResults, resultsCsv, csvCell, analyticsFor, myAttemptList, myAnalytics };
