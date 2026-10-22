'use strict';
// What a student sees of exams: the dashboard list (SCREENS C1) and the detail page (C2).
// Every student sees every published exam; nothing here contains a question.

const store = require('./store');
const clock = require('./clock');
const { notFound } = require('./errors');
const { totalMarks } = require('./questions');
const proctoringLib = require('./proctoring');
const { refreshAttempts } = require('./finalize');
const { percentOf } = require('./visibility');

/**
 * @returns {'in_progress'|'open'|'upcoming'|'submitted'|'closed'}
 */
function myStatus(exam, mine, nowMs) {
  if (mine.some((a) => a.status === 'in_progress')) return 'in_progress';
  const left = exam.maxAttempts - mine.length;
  const opens = clock.ms(exam.opensAt);
  const closes = clock.ms(exam.closesAt);
  if (opens !== null && nowMs < opens) return 'upcoming';
  const isOpen = closes !== null && nowMs < closes;
  if (isOpen && left > 0) return 'open';
  return mine.length > 0 ? 'submitted' : 'closed';
}

function latest(attempts) {
  return attempts.toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null;
}

function examCard(exam, mine, nowMs) {
  const open = mine.find((a) => a.status === 'in_progress') || null;
  const last = latest(mine.filter((a) => a.status === 'submitted'));
  return {
    id: exam.id, code: exam.code, title: exam.title, description: exam.description,
    questionCount: exam.questions.length, totalMarks: totalMarks(exam.questions), durationMinutes: exam.durationMinutes,
    opensAt: exam.opensAt, closesAt: exam.closesAt, maxAttempts: exam.maxAttempts,
    attemptsUsed: mine.length, attemptsLeft: Math.max(0, exam.maxAttempts - mine.length),
    myStatus: myStatus(exam, mine, nowMs),
    openAttemptId: open ? open.id : null,
    deadlineAt: open ? open.deadlineAt : null,
    lastAttemptId: last ? last.id : null,
    submittedAt: last ? last.submittedAt : null,
    resultVisible: Boolean(last && last.resultVisibleAt),
    lastPercent: last && last.resultVisibleAt ? percentOf(last) : null,
    resultVisibility: exam.resultPolicy.visibility,
  };
}

async function myAttempts(userId) {
  return refreshAttempts(store.read('attempts').filter((a) => a.userId === userId));
}

/** exams.list */
async function listForStudent(user) {
  const nowMs = clock.now();
  const attempts = await myAttempts(user.id);
  const exams = store.read('exams').filter((e) => e.status === 'published');
  const cards = exams.map((exam) => examCard(exam, attempts.filter((a) => a.examId === exam.id), nowMs));
  return { exams: cards.toSorted((a, b) => (a.opensAt || '').localeCompare(b.opensAt || '')), serverNow: clock.iso(nowMs) };
}

function cannotStartReason(card) {
  if (card.myStatus === 'in_progress') return null;
  if (card.myStatus === 'upcoming') return 'EXAM_NOT_OPEN';
  if (card.myStatus === 'open') return null;
  return card.attemptsLeft === 0 ? 'NO_ATTEMPTS_LEFT' : 'EXAM_NOT_OPEN';
}

/** exams.get: details, rules config, terms and a proctoring summary. No questions. */
async function getForStudent(user, examId) {
  const exam = store.findById('exams', examId);
  if (!exam || exam.status !== 'published') throw notFound('This exam');
  const attempts = (await myAttempts(user.id)).filter((a) => a.examId === examId);
  const card = examCard(exam, attempts, clock.now());
  const reason = cannotStartReason(card);
  return {
    exam: {
      ...card,
      instructions: exam.instructions,
      terms: exam.terms,
      termsVersion: exam.termsUpdatedAt.slice(0, 10),
      resultPolicy: { visibility: exam.resultPolicy.visibility, passPercent: exam.resultPolicy.passPercent },
      proctoring: proctoringLib.studentProctoring(exam.proctoring, null),
      proctoringSummary: proctoringLib.summary(exam.proctoring),
      canStart: reason === null,
      cannotStartReason: reason,
    },
    serverNow: clock.iso(),
  };
}

module.exports = { listForStudent, getForStudent, myAttempts };
