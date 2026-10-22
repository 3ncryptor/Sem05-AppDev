'use strict';
// Builder actions on an exam's questions. Published exams are locked (EXAM_LOCKED); duplicate to edit.

const { AppError, validationError, notFound } = require('./errors');
const { parseQuestion, questionProblems } = require('./questions');
const { getExam, saveExam } = require('./examStore');
const { scoreAnswer, isValidResponse, outcomeOf } = require('./scoring');

function assertEditable(exam) {
  if (exam.status === 'published') {
    throw new AppError('EXAM_LOCKED', 'Published · questions are locked. Unpublish (no one has started) or duplicate the exam to make changes.');
  }
}

function findQuestion(exam, questionId) {
  const question = exam.questions.find((q) => q.id === questionId);
  if (!question) throw notFound('This question');
  return question;
}

function withProblems(question) {
  return { ...question, problems: questionProblems(question) };
}

/** Adds a question at the end, or right after `afterId`. */
async function createQuestion(examId, input) {
  assertEditable(getExam(examId));
  const question = parseQuestion(input, null);
  await saveExam(examId, (exam) => {
    const at = input.afterId ? exam.questions.findIndex((q) => q.id === input.afterId) + 1 : exam.questions.length;
    const index = at > 0 ? at : exam.questions.length;
    return { ...exam, questions: [...exam.questions.slice(0, index), question, ...exam.questions.slice(index)] };
  });
  return withProblems(question);
}

async function updateQuestion(examId, questionId, input) {
  const exam = getExam(examId);
  assertEditable(exam);
  const updated = parseQuestion(input, findQuestion(exam, questionId));
  await saveExam(examId, (e) => ({ ...e, questions: e.questions.map((q) => (q.id === questionId ? updated : q)) }));
  return withProblems(updated);
}

async function deleteQuestion(examId, questionId) {
  const exam = getExam(examId);
  assertEditable(exam);
  findQuestion(exam, questionId);
  await saveExam(examId, (e) => ({ ...e, questions: e.questions.filter((q) => q.id !== questionId) }));
  return { deleted: true };
}

/** @param {string[]} order every question id exactly once */
async function reorderQuestions(examId, order) {
  const exam = getExam(examId);
  assertEditable(exam);
  const ids = exam.questions.map((q) => q.id);
  const isPermutation = order.length === ids.length && new Set(order).size === ids.length && order.every((id) => ids.includes(id));
  if (!isPermutation) throw validationError({ order: 'Must list every question exactly once' });
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  await saveExam(examId, (e) => ({ ...e, questions: order.map((id) => byId.get(id)) }));
  return { order };
}

/** "Answer as a student to check the key" in the builder preview. Works on published exams too. */
function previewScore(examId, questionId, response) {
  const question = findQuestion(getExam(examId), questionId);
  if (!isValidResponse(question, response)) throw new AppError('INVALID_RESPONSE', "That answer doesn't fit this question type.");
  const marksAwarded = scoreAnswer(question, response);
  return { marksAwarded, marks: question.marks, result: outcomeOf(question, response, marksAwarded) };
}

module.exports = { createQuestion, updateQuestion, deleteQuestion, reorderQuestions, previewScore };
