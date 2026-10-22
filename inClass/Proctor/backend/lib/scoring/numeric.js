'use strict';
// numeric: type a number. Within ± tolerance (absolute) of the answer is full marks.

const { isPlainObject } = require('./common');

const UNIT_MAX = 16;
// Floating point: 0.1 + 0.2 is 0.30000000000000004, which must still be "within 0".
const EPSILON = 1e-9;

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const unit = typeof config.unit === 'string' && config.unit.trim() ? config.unit.trim() : null;
  const answer = key.answer === undefined ? null : key.answer;
  const tolerance = key.tolerance === undefined ? 0 : key.tolerance;
  const errors = {};
  if (unit && unit.length > UNIT_MAX) errors['config.unit'] = `At most ${UNIT_MAX} characters`;
  if (answer !== null && (typeof answer !== 'number' || !Number.isFinite(answer))) errors['key.answer'] = 'Must be a number';
  if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) errors['key.tolerance'] = 'Must be 0 or more';
  return {
    config: { unit },
    key: { answer: typeof answer === 'number' && Number.isFinite(answer) ? answer : null, tolerance: Number(tolerance) || 0 },
    errors,
  };
}

function keyProblems(q) {
  return typeof q.key.answer === 'number' ? [] : ['no correct number'];
}

function validateResponse(q, r) {
  return isPlainObject(r) && typeof r.number === 'number' && Number.isFinite(r.number);
}

function score(q, r) {
  return Math.abs(r.number - q.key.answer) <= q.key.tolerance + EPSILON ? q.marks : 0;
}

function studentConfig(q) {
  return { unit: q.config.unit };
}

function label(q, r) {
  return String(r.number);
}

module.exports = { parseDefinition, keyProblems, validateResponse, score, studentConfig, label, shuffle: null };
