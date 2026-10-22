'use strict';
// true_false: one statement. Full marks or 0.

const { isPlainObject } = require('./common');

function parseDefinition(input) {
  const key = isPlainObject(input.key) ? input.key : {};
  const value = key.value === undefined || key.value === null ? null : key.value;
  const errors = value !== null && typeof value !== 'boolean' ? { 'key.value': 'Must be true or false' } : {};
  return { config: {}, key: { value: typeof value === 'boolean' ? value : null }, errors };
}

function keyProblems(q) {
  return typeof q.key.value === 'boolean' ? [] : ['no correct answer'];
}

function validateResponse(q, r) {
  return isPlainObject(r) && typeof r.value === 'boolean';
}

function score(q, r) {
  return r.value === q.key.value ? q.marks : 0;
}

function studentConfig() {
  return {};
}

function label(q, r) {
  return r.value ? 'True' : 'False';
}

module.exports = { parseDefinition, keyProblems, validateResponse, score, studentConfig, label, shuffle: null };
