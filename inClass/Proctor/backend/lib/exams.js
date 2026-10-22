'use strict';
// Admin side of exams: list, create (or duplicate), edit, settings, proctoring, publish (BUILD_PLAN §6.3).

const store = require('./store');
const clock = require('./clock');
const { AppError, validationError } = require('./errors');
const { newId } = require('./ids');
const { check } = require('./validate');
const { VISIBILITY } = require('./constants');
const { SAMPLE_TERMS } = require('./terms');
const proctoringLib = require('./proctoring');
const { checklist, windowProblems } = require('./checklist');
const { totalMarks } = require('./questions');
const { getExam, saveExam, attemptsFor, hasStarted, displayStatus } = require('./examStore');
const { syncExam, percentOf } = require('./visibility');

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,15}$/;

const META_FIELDS = {
  title: { type: 'string', min: 1, max: 120 },
  code: { type: 'string', max: 16, pattern: CODE_PATTERN, patternMessage: 'Capital letters, digits and dashes' },
  description: { type: 'string', max: 2000, trim: false },
};

const SETTINGS_FIELDS = {
  durationMinutes: { type: 'integer', min: 1, max: 600 },
  opensAt: { type: 'date', nullable: true },
  closesAt: { type: 'date', nullable: true },
  maxAttempts: { type: 'integer', min: 1, max: 10 },
  shuffleQuestions: { type: 'boolean' },
  shuffleOptions: { type: 'boolean' },
  instructions: { type: 'string', max: 5000, trim: false },
  terms: { type: 'string', max: 20000, trim: false },
  resultPolicy: {
    type: 'object',
    fields: {
      visibility: { type: 'string', enum: VISIBILITY },
      passPercent: { type: 'number', min: 0, max: 100 },
      holdAutoEnded: { type: 'boolean' },
    },
  },
};

/** A readable unique code from the title, e.g. "Electron Apps" → "ELE-02". */
function makeCode(title) {
  const letters = title.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'EXM';
  const taken = new Set(store.read('exams').map((e) => e.code));
  let n = 1;
  while (taken.has(`${letters}-${String(n).padStart(2, '0')}`)) n += 1;
  return `${letters}-${String(n).padStart(2, '0')}`;
}

function blankExam(nowIso) {
  return {
    status: 'draft', durationMinutes: 30, opensAt: null, closesAt: null, maxAttempts: 1,
    shuffleQuestions: true, shuffleOptions: true, instructions: '', terms: SAMPLE_TERMS, termsUpdatedAt: nowIso,
    resultPolicy: { visibility: 'after_publish', passPercent: 40, holdAutoEnded: true },
    resultsPublishedAt: null, publishedAt: null, proctoring: proctoringLib.preset('standard'), questions: [],
  };
}

function copiedExam(source, nowIso) {
  const { id, code, title, description, status, publishedAt, resultsPublishedAt, createdAt, updatedAt, questions, ...settings } = source;
  return {
    ...blankExam(nowIso), ...settings, termsUpdatedAt: nowIso,
    questions: questions.map((q) => ({ ...q, id: newId('qn') })),
  };
}

/** @param {{ title: string, code?: string, description?: string, copyFromId?: string }} input */
async function createExam(input) {
  const nowIso = clock.iso();
  const source = input.copyFromId ? getExam(input.copyFromId) : null;
  const body = source ? copiedExam(source, nowIso) : blankExam(nowIso);
  const exam = {
    id: newId('ex'),
    code: input.code || makeCode(input.title),
    title: input.title,
    description: input.description !== undefined ? input.description : source ? source.description : '',
    ...body,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await store.insert('exams', exam);
  return adminExam(store.findById('exams', exam.id));
}

/** Title, code and description can change at any time. */
async function updateMeta(examId, input) {
  getExam(examId);
  return adminExam(await saveExam(examId, (exam) => ({ ...exam, ...input })));
}

async function deleteExam(examId) {
  const exam = getExam(examId);
  if (exam.status !== 'draft') throw new AppError('EXAM_LOCKED', 'Only drafts can be deleted. Unpublish it first.');
  await store.removeWhere('exams', (e) => e.id === examId);
  return { deleted: true };
}

function lockedSettingErrors(exam, next) {
  const started = attemptsFor(exam.id);
  if (started.length === 0) return {};
  const errors = {};
  const reason = 'Locked: a student has already started';
  if (next.durationMinutes !== exam.durationMinutes) errors.durationMinutes = reason;
  if (next.maxAttempts !== exam.maxAttempts) errors.maxAttempts = reason;
  const earliestStart = Math.min(...started.map((a) => clock.ms(a.startedAt)));
  if (clock.ms(next.opensAt) === null || clock.ms(next.opensAt) > earliestStart) {
    errors.opensAt = "Can't open later than a start that already happened";
  }
  if (clock.ms(next.closesAt) === null || clock.ms(next.closesAt) < clock.now()) errors.closesAt = "Can't close in the past";
  return errors;
}

function publishedWindowErrors(next) {
  if (next.status !== 'published') return {};
  const problems = windowProblems(next);
  return problems.length ? { closesAt: problems[0].message } : {};
}

/** @param {string} examId @param {object} input the settings object (partial is fine) */
async function updateSettings(examId, input) {
  const exam = getExam(examId);
  const { value, errors } = check(SETTINGS_FIELDS, input);
  if (Object.keys(errors).length) throw validationError(errors);
  const next = {
    ...exam, ...value,
    resultPolicy: { ...exam.resultPolicy, ...(value.resultPolicy || {}) },
    termsUpdatedAt: value.terms !== undefined && value.terms !== exam.terms ? clock.iso() : exam.termsUpdatedAt,
  };
  const ruleErrors = { ...lockedSettingErrors(exam, next), ...publishedWindowErrors(next) };
  if (Object.keys(ruleErrors).length) throw validationError(ruleErrors);
  const saved = await saveExam(examId, () => next);
  await syncExam(saved);
  return adminExam(saved);
}

async function updateProctoring(examId, input) {
  const exam = getExam(examId);
  if (hasStarted(examId)) throw new AppError('EXAM_LOCKED', 'Proctoring is locked because a student has started.');
  const proctoring = proctoringLib.parseProctoring(input, exam.proctoring);
  return adminExam(await saveExam(examId, (e) => ({ ...e, proctoring })));
}

/** dryRun returns the checklist; otherwise publishes or refuses with every problem. */
async function publishExam(examId, dryRun) {
  const exam = getExam(examId);
  const result = checklist(exam);
  if (dryRun || exam.status === 'published') return { ...result, status: exam.status };
  if (!result.publishable) {
    throw new AppError('NOT_PUBLISHABLE', 'Fix these problems before publishing.', { problems: result.problems, warnings: result.warnings });
  }
  const saved = await saveExam(examId, (e) => ({ ...e, status: 'published', publishedAt: clock.iso() }));
  return { ...result, status: saved.status, exam: adminExam(saved) };
}

async function unpublishExam(examId) {
  const exam = getExam(examId);
  if (exam.status !== 'published') return adminExam(exam);
  if (hasStarted(examId)) throw new AppError('EXAM_LOCKED', 'A student has started, so it can no longer be unpublished. Duplicate it instead.');
  return adminExam(await saveExam(examId, (e) => ({ ...e, status: 'draft', publishedAt: null })));
}

function attemptCounts(examId) {
  const attempts = attemptsFor(examId);
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const percents = submitted.map(percentOf).filter((p) => p !== null);
  return {
    started: attempts.length,
    submitted: submitted.length,
    inProgress: attempts.length - submitted.length,
    meanPercent: percents.length ? Math.round((percents.reduce((s, p) => s + p, 0) / percents.length) * 10) / 10 : null,
    flagged: attempts.filter((a) => a.flagCount > 0).length,
    pendingReview: submitted.filter((a) => a.review.status === 'pending' && (a.flagCount > 0 || a.submitReason === 'flag_limit')).length,
    students: new Set(attempts.map((a) => a.userId)).size,
  };
}

/** The full exam for the builder, with keys, plus the computed bits every admin tab reads. */
function adminExam(exam) {
  const started = hasStarted(exam.id);
  const list = checklist(exam);
  return {
    ...exam,
    displayStatus: displayStatus(exam),
    totalMarks: totalMarks(exam.questions),
    termsVersion: exam.termsUpdatedAt.slice(0, 10),
    locked: { questions: exam.status === 'published', proctoring: started, duration: started, attempts: started },
    problems: list.problems,
    warnings: list.warnings,
    counts: attemptCounts(exam.id),
    proctoringSummary: proctoringLib.summary(exam.proctoring),
  };
}

function listRow(exam) {
  const counts = attemptCounts(exam.id);
  return {
    id: exam.id, code: exam.code, title: exam.title, status: exam.status, displayStatus: displayStatus(exam),
    questionCount: exam.questions.length, totalMarks: totalMarks(exam.questions),
    durationMinutes: exam.durationMinutes, opensAt: exam.opensAt, closesAt: exam.closesAt,
    attemptsStarted: counts.started, inProgress: counts.inProgress, pendingReview: counts.pendingReview,
    studentCount: store.read('users').filter((u) => u.role === 'student' && u.active).length,
    resultVisibility: exam.resultPolicy.visibility, resultsPublishedAt: exam.resultsPublishedAt,
    problemCount: checklist(exam).problems.length, updatedAt: exam.updatedAt,
  };
}

function listExams() {
  const rows = store.read('exams').map(listRow);
  return { exams: rows.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
}

module.exports = {
  META_FIELDS, createExam, updateMeta, deleteExam, updateSettings, updateProctoring, publishExam,
  unpublishExam, adminExam, listExams, attemptCounts,
};
