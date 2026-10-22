'use strict';
// Small read helpers for exams and their attempts, shared by the admin and student services.

const store = require('./store');
const clock = require('./clock');
const { notFound } = require('./errors');

/** @param {string} examId @returns {object} */
function getExam(examId) {
  const exam = store.findById('exams', examId);
  if (!exam) throw notFound('This exam');
  return exam;
}

/** @param {string} examId @param {(exam: object) => object} fn */
async function saveExam(examId, fn) {
  const nowIso = clock.iso();
  const saved = await store.updateById('exams', examId, (exam) => ({ ...fn(exam), updatedAt: nowIso }));
  if (!saved) throw notFound('This exam');
  return saved;
}

/** @param {string} examId */
function attemptsFor(examId) {
  return store.read('attempts').filter((a) => a.examId === examId);
}

/** Once anyone has started, duration, attempts and proctoring are locked. */
function hasStarted(examId) {
  return store.read('attempts').some((a) => a.examId === examId);
}

/**
 * The chip on admin screens: draft, published (window not open yet), live (window open), closed.
 * @returns {'draft'|'published'|'live'|'closed'}
 */
function displayStatus(exam, nowMs = clock.now()) {
  if (exam.status !== 'published') return 'draft';
  const opens = clock.ms(exam.opensAt);
  const closes = clock.ms(exam.closesAt);
  if (closes !== null && nowMs >= closes) return 'closed';
  if (opens !== null && nowMs < opens) return 'published';
  return 'live';
}

/** "Right after submitting" vs "when I publish". */
function showsResultsOnSubmit(exam) {
  return exam.resultPolicy.visibility === 'after_submit';
}

module.exports = { getExam, saveExam, attemptsFor, hasStarted, displayStatus, showsResultsOnSubmit };
