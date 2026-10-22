'use strict';
// single: pick one option. Full marks or 0.

const { parseItems, listProblems, orderBy, letter, isPlainObject } = require('./common');

const MAX_OPTIONS = 8;

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const { items: options, errors } = parseItems(config.options, 'op', 'config.options', MAX_OPTIONS);
  const optionId = typeof key.optionId === 'string' ? key.optionId : null;
  const keyErrors = optionId && !options.some((o) => o.id === optionId) ? { 'key.optionId': 'Pick one of the options' } : {};
  return { config: { options }, key: { optionId }, errors: { ...errors, ...keyErrors } };
}

function keyProblems(q) {
  const problems = listProblems(q.config.options, 2, 'options');
  return q.key.optionId ? problems : [...problems, 'no correct option'];
}

function validateResponse(q, r) {
  return isPlainObject(r) && typeof r.optionId === 'string' && q.config.options.some((o) => o.id === r.optionId);
}

function score(q, r) {
  return r.optionId === q.key.optionId ? q.marks : 0;
}

function studentConfig(q, order) {
  return { options: orderBy(q.config.options, order) };
}

function label(q, r) {
  const i = q.config.options.findIndex((o) => o.id === r.optionId);
  return i < 0 ? '?' : letter(i);
}

module.exports = {
  parseDefinition, keyProblems, validateResponse, score, studentConfig, label,
  shuffle: { list: 'options', always: false },
};
