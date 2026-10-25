'use strict';
// Admin read models: home (A1), the live monitor (A9) and the review queue (A10).
// "Needs attention" and heartbeat gaps are computed at read time; there is no background job.

const store = require('./store');
const clock = require('./clock');
const { TIMING, LIMITS } = require('./constants');
const { getExam, displayStatus } = require('./examStore');
const { refreshAttempts } = require('./finalize');
const { computeRisk } = require('./risk');
const { effectiveMaxFlags } = require('./proctoring');
const { checklist } = require('./checklist');
const { isHeld } = require('./visibility');
const files = require('./attemptFiles');
const { answeredCount } = require('./attemptViews');

function studentOf(attempt) {
  const user = store.findById('users', attempt.userId);
  return user ? { id: user.id, rollNo: user.rollNo, name: user.name } : { id: attempt.userId, rollNo: '?', name: 'Unknown' };
}

/** Submitted, undecided, and something to look at. */
function needsReview(attempt) {
  return attempt.status === 'submitted' && attempt.review.status === 'pending'
    && (attempt.flagCount > 0 || attempt.submitReason === 'flag_limit' || attempt.risk.level !== 'low');
}

function needsAttention(attempt, nowMs) {
  if (attempt.status !== 'in_progress') return false;
  const sensors = attempt.sensors || {};
  return nowMs - clock.ms(attempt.lastSeenAt) > TIMING.ATTENTION_SILENCE_MS
    || sensors.camera === 'lost'
    || sensors.faceDetector === 'unavailable'
    || attempt.faceDetection === 'unavailable';
}

/** Attempts of an exam with overdue ones finished, plus their files and a fresh risk score. */
async function loadExamAttempts(exam) {
  const attempts = await refreshAttempts(store.read('attempts').filter((a) => a.examId === exam.id));
  const nowMs = clock.now();
  return Promise.all(attempts.map(async (attempt) => {
    const data = await files.readAll(attempt);
    return { attempt, ...data, risk: computeRisk({ attempt, exam, ...data, nowMs }) };
  }));
}

function latestScreenshot(captures) {
  const screens = captures.filter((c) => c.kind === 'screen').toSorted((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return screens.length ? screens[screens.length - 1].file : null;
}

function liveCard({ attempt, captures, risk }, exam, nowMs) {
  const sensors = attempt.sensors || {};
  return {
    id: attempt.id, code: attempt.code, student: studentOf(attempt), status: attempt.status, submitReason: attempt.submitReason,
    startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, lastSeenAt: attempt.lastSeenAt,
    answered: answeredCount(attempt), questionCount: attempt.questionOrder.length,
    secondsSinceSeen: Math.round((nowMs - clock.ms(attempt.lastSeenAt)) / 1000),
    timeLeftSec: attempt.status === 'in_progress' ? Math.max(0, Math.round((clock.ms(attempt.deadlineAt) - nowMs) / 1000)) : 0,
    flagCount: attempt.flagCount, maxFlags: effectiveMaxFlags(exam.proctoring, attempt),
    risk: { score: risk.score, level: risk.level },
    sensors: { fullscreen: sensors.fullscreen ?? null, focused: sensors.focused ?? null, camera: sensors.camera ?? null, faces: sensors.faces ?? null, displays: sensors.displays ?? null, faceDetector: sensors.faceDetector ?? attempt.faceDetection, online: sensors.online ?? null },
    latestScreenshot: latestScreenshot(captures),
    needsAttention: needsAttention(attempt, nowMs),
  };
}

function feedOf(rows, sinceMs) {
  return rows
    .flatMap(({ attempt, flags }) => flags.map((f) => ({ f, attempt })))
    .filter(({ f }) => sinceMs === null || clock.ms(f.startedAt) > sinceMs)
    .toSorted((x, y) => y.f.startedAt.localeCompare(x.f.startedAt))
    .slice(0, LIMITS.LIVE_FEED)
    .map(({ f, attempt }) => {
      const student = studentOf(attempt);
      return {
        at: f.startedAt, attemptId: attempt.id, studentName: student.name, rollNo: student.rollNo,
        flagId: f.id, flagNo: f.flagNo, rules: f.rules, types: f.types, counted: f.counted,
        dismissed: Boolean(f.dismissed), captures: f.captures,
      };
    });
}

/** admin.live: counters, one card per attempt, and the flag feed since `since`. */
async function liveView(examId, since) {
  const exam = getExam(examId);
  const rows = await loadExamAttempts(exam);
  const nowMs = clock.now();
  const cards = rows.map((row) => liveCard(row, exam, nowMs));
  return {
    serverNow: clock.iso(nowMs),
    exam: { id: exam.id, title: exam.title, displayStatus: displayStatus(exam, nowMs) },
    counters: {
      writing: cards.filter((c) => c.status === 'in_progress').length,
      flagged: cards.filter((c) => c.flagCount > 0).length,
      needsAttention: cards.filter((c) => c.needsAttention).length,
      endedByFlags: cards.filter((c) => c.submitReason === 'flag_limit').length,
      submitted: cards.filter((c) => c.status === 'submitted').length,
    },
    attempts: cards,
    feed: feedOf(rows, clock.ms(since)),
  };
}

const SORTS = {
  risk: (a, b) => b.risk.score - a.risk.score,
  flags: (a, b) => b.flagCount - a.flagCount,
  recent: (a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''),
};

/** admin.reviewQueue: submitted attempts, highest risk first by default. */
async function reviewQueue(examId, { status = 'pending', rule = 'any', sort = 'risk' }) {
  const exam = getExam(examId);
  const rows = (await loadExamAttempts(exam)).filter(({ attempt }) => attempt.status === 'submitted');
  const queue = rows
    .filter(({ attempt }) => (status === 'pending' ? needsReview(attempt) : status === 'all' || attempt.review.status === status))
    .filter(({ flags }) => rule === 'any' || flags.some((f) => !f.dismissed && f.rules.includes(rule)))
    .map(({ attempt, flags, risk }) => ({
      attemptId: attempt.id, student: studentOf(attempt), status: attempt.status, submitReason: attempt.submitReason,
      submittedAt: attempt.submittedAt, flagCount: attempt.flagCount, maxFlags: effectiveMaxFlags(exam.proctoring, attempt),
      risk: { score: risk.score, level: risk.level, reasons: risk.reasons }, review: attempt.review, held: isHeld(attempt, exam),
      rules: [...new Set(flags.filter((f) => !f.dismissed).flatMap((f) => f.rules))],
    }))
    .toSorted(SORTS[sort] || SORTS.risk);
  return { queue, pendingCount: rows.filter(({ attempt }) => needsReview(attempt)).length };
}

function recentActivity(attempts, examsById) {
  const label = { student: 'submitted', deadline: 'ran out of time in', flag_limit: 'was ended by flags in', admin: 'was ended by the examiner in' };
  return attempts
    .filter((a) => a.status === 'submitted' && examsById.has(a.examId))
    .toSorted((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 10)
    .map((a) => ({
      at: a.submittedAt, kind: a.submitReason, attemptId: a.id, examId: a.examId, examTitle: examsById.get(a.examId).title,
      studentName: studentOf(a).name, score: a.score, maxScore: a.maxScore, text: `${studentOf(a).name} ${label[a.submitReason]} ${examsById.get(a.examId).title}`,
    }));
}

function attentionItems(exams, attempts) {
  return exams.flatMap((exam) => {
    const mine = attempts.filter((a) => a.examId === exam.id);
    const toReview = mine.filter(needsReview).length;
    const ready = mine.filter((a) => a.status === 'submitted' && !isHeld(a, exam)).length;
    const items = [];
    if (toReview) items.push({ kind: 'review', examId: exam.id, examTitle: exam.title, count: toReview, message: `${toReview} attempt${toReview === 1 ? '' : 's'} waiting for review` });
    if (exam.status === 'published' && exam.resultPolicy.visibility === 'after_publish' && !exam.resultsPublishedAt && ready) {
      items.push({ kind: 'publish_results', examId: exam.id, examTitle: exam.title, count: ready, message: `results not published (${ready} ready)` });
    }
    const problems = exam.status === 'draft' ? checklist(exam).problems.length : 0;
    if (problems) items.push({ kind: 'draft_problems', examId: exam.id, examTitle: exam.title, count: problems, message: `draft · ${problems} problem${problems === 1 ? '' : 's'} before publishing` });
    return items;
  });
}

/** admin.home */
async function homeView() {
  const exams = store.read('exams');
  const attempts = await refreshAttempts(store.read('attempts'));
  const examsById = new Map(exams.map((e) => [e.id, e]));
  const attention = attentionItems(exams, attempts);
  return {
    tiles: {
      liveExams: exams.filter((e) => displayStatus(e) === 'live').length,
      writing: attempts.filter((a) => a.status === 'in_progress').length,
      toReview: attempts.filter(needsReview).length,
      resultsReady: attention.filter((i) => i.kind === 'publish_results').length,
    },
    attention,
    recent: recentActivity(attempts, examsById),
  };
}

module.exports = { liveView, reviewQueue, homeView, needsReview, studentOf, loadExamAttempts };
