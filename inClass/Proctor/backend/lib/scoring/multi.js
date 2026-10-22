'use strict';
// multi: pick all that apply.
//   all_or_nothing: full marks only for exactly the right set.
//   partial: marks × max(0, (right − wrong) / correct), so guessing everything earns nothing.

const { parseItems, listProblems, orderBy, letter, isStringArray, isPlainObject } = require('./common');

const MAX_OPTIONS = 8;
const SCORING = ['all_or_nothing', 'partial'];

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const { items: options, errors } = parseItems(config.options, 'op', 'config.options', MAX_OPTIONS);
  const scoring = config.scoring === undefined ? 'all_or_nothing' : config.scoring;
  const optionIds = key.optionIds === undefined ? [] : key.optionIds;
  const ids = options.map((o) => o.id);
  const extra = {};
  if (!SCORING.includes(scoring)) extra['config.scoring'] = `Must be one of: ${SCORING.join(', ')}`;
  if (!isStringArray(optionIds) || !optionIds.every((id) => ids.includes(id)) || new Set(optionIds).size !== optionIds.length) {
    extra['key.optionIds'] = 'Pick options from the list';
  }
  return { config: { options, scoring }, key: { optionIds: isStringArray(optionIds) ? optionIds : [] }, errors: { ...errors, ...extra } };
}

function keyProblems(q) {
  const problems = listProblems(q.config.options, 2, 'options');
  return q.key.optionIds.length > 0 ? problems : [...problems, 'no correct option'];
}

function validateResponse(q, r) {
  if (!isPlainObject(r) || !isStringArray(r.optionIds)) return false;
  const ids = q.config.options.map((o) => o.id);
  return new Set(r.optionIds).size === r.optionIds.length && r.optionIds.every((id) => ids.includes(id));
}

function score(q, r) {
  const correct = q.key.optionIds;
  const right = r.optionIds.filter((id) => correct.includes(id)).length;
  const wrong = r.optionIds.length - right;
  if (q.config.scoring === 'partial') return q.marks * Math.max(0, (right - wrong) / correct.length);
  return right === correct.length && wrong === 0 ? q.marks : 0;
}

function studentConfig(q, order) {
  return { options: orderBy(q.config.options, order) };
}

function label(q, r) {
  const letters = q.config.options.map((o, i) => (r.optionIds.includes(o.id) ? letter(i) : null)).filter(Boolean);
  return letters.length ? letters.join('+') : 'none';
}

module.exports = {
  parseDefinition, keyProblems, validateResponse, score, studentConfig, label,
  shuffle: { list: 'options', always: false },
};
