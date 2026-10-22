'use strict';
// Questions inside an exam: builder input, publish problems, student-safe views.

const { QUESTION_TYPES } = require('./constants');
const { check } = require('./validate');
const { validationError } = require('./errors');
const { newId } = require('./ids');
const { typeModule } = require('./scoring');

const SHARED_FIELDS = {
  text: { type: 'string', max: 5000, trim: false },
  marks: { type: 'number', min: 0.5, max: 100 },
  topic: { type: 'string', max: 60 },
  explanation: { type: 'string', max: 3000, trim: false },
};

const TYPE_LABELS = Object.freeze({
  single: 'Single choice', multi: 'Multiple select', true_false: 'True / false', short_text: 'Short answer',
  numeric: 'Number', ordering: 'Put in order', matching: 'Match pairs',
});

function hasKeyErrors(errors) {
  return Object.keys(errors).some((path) => path.startsWith('key.'));
}

/**
 * Parses the type-specific part. If the builder sent new config but no key and the old key no
 * longer fits (say the correct option was deleted), the key is cleared instead of failing autosave.
 */
function parseTypePart(type, input, existing) {
  const keepOld = existing && existing.type === type;
  const config = input.config !== undefined ? input.config : keepOld ? existing.config : undefined;
  const key = input.key !== undefined ? input.key : keepOld ? existing.key : undefined;
  const parsed = typeModule(type).parseDefinition({ config, key });
  if (input.key === undefined && hasKeyErrors(parsed.errors)) return typeModule(type).parseDefinition({ config });
  return parsed;
}

/**
 * Builds a stored question from builder input. With `existing`, missing fields keep their values;
 * changing the type clears config and key unless new ones are sent.
 * @param {object} input @param {object|null} existing
 * @returns {object} question
 */
function parseQuestion(input, existing = null) {
  const type = input.type !== undefined ? input.type : existing && existing.type;
  if (!QUESTION_TYPES.includes(type)) throw validationError({ type: `Must be one of: ${QUESTION_TYPES.join(', ')}` });
  const shared = check(SHARED_FIELDS, input);
  const part = parseTypePart(type, input, existing);
  const errors = { ...shared.errors, ...part.errors };
  if (Object.keys(errors).length) throw validationError(errors);
  const previous = existing || { text: '', marks: 1, topic: '', explanation: '' };
  return {
    id: existing ? existing.id : newId('qn'),
    type,
    text: shared.value.text !== undefined ? shared.value.text : previous.text,
    marks: shared.value.marks !== undefined ? shared.value.marks : previous.marks,
    topic: shared.value.topic !== undefined ? shared.value.topic : previous.topic,
    explanation: shared.value.explanation !== undefined ? shared.value.explanation : previous.explanation,
    config: part.config,
    key: part.key,
  };
}

/** Everything that stops this question from being published, as short phrases. */
function questionProblems(question) {
  const shared = question.text.trim() === '' ? ['has no question text'] : [];
  return [...shared, ...typeModule(question.type).keyProblems(question)];
}

/** One line for outlines and checklists: "Q3 Which process…" */
function shortStem(question, index) {
  const firstLine = question.text.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
  const stem = firstLine.length > 48 ? `${firstLine.slice(0, 47)}…` : firstLine || '(no text)';
  return `Q${index + 1} ${stem}`;
}

/**
 * The question as a student sees it during the exam: no key, no explanation,
 * lists in this attempt's shuffled order.
 */
function studentQuestion(question, optionOrder) {
  return {
    id: question.id,
    type: question.type,
    text: question.text,
    marks: question.marks,
    topic: question.topic,
    config: typeModule(question.type).studentConfig(question, optionOrder ? optionOrder[question.id] : undefined),
  };
}

/** @param {readonly object[]} questions */
function totalMarks(questions) {
  return questions.reduce((sum, q) => sum + q.marks, 0);
}

module.exports = { parseQuestion, questionProblems, shortStem, studentQuestion, totalMarks, TYPE_LABELS };
