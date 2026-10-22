'use strict';
// One module per question type, each with the same parts:
//   parseDefinition(input)  → { config, key, errors }   (builder input)
//   keyProblems(question)   → string[]                  (publish checklist)
//   validateResponse(q, r)  → boolean                   (answers.save)
//   score(q, r)             → number                    (pure; rounded and clamped here)
//   studentConfig(q, order) → config without the key    (what the student sees)
//   label(q, r)             → short text for "most common wrong answer"
//   shuffle                 → which list a student gets shuffled, and whether always

const single = require('./single');
const multi = require('./multi');
const trueFalse = require('./trueFalse');
const shortText = require('./shortText');
const numeric = require('./numeric');
const ordering = require('./ordering');
const matching = require('./matching');

const TYPES = Object.freeze({
  single, multi, true_false: trueFalse, short_text: shortText, numeric, ordering, matching,
});

/** @param {string} type */
function typeModule(type) {
  const mod = TYPES[type];
  if (!mod) throw new Error(`Unknown question type: ${type}`);
  return mod;
}

/** Rounds half-up to 2 decimals (BUILD_PLAN §5.4). @param {number} n */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** null (cleared or unanswered) is always allowed. */
function isValidResponse(question, response) {
  return response === null || typeModule(question.type).validateResponse(question, response);
}

/**
 * Marks for one answer: 0 for no answer, never negative, never above the question's marks.
 * @param {{ type: string, marks: number }} question
 * @param {unknown} response
 * @returns {number}
 */
function scoreAnswer(question, response) {
  if (response === null || response === undefined) return 0;
  if (!isValidResponse(question, response)) return 0;
  const raw = typeModule(question.type).score(question, response);
  return round2(Math.min(question.marks, Math.max(0, raw)));
}

/** @returns {'correct'|'partial'|'wrong'|'unanswered'} */
function outcomeOf(question, response, marksAwarded) {
  if (response === null || response === undefined) return 'unanswered';
  if (marksAwarded >= question.marks) return 'correct';
  return marksAwarded > 0 ? 'partial' : 'wrong';
}

module.exports = { TYPES, typeModule, round2, isValidResponse, scoreAnswer, outcomeOf };
