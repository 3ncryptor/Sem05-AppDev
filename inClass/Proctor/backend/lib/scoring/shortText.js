'use strict';
// short_text: type a short answer. It matches if, after trimming and collapsing spaces
// (and lower-casing unless caseSensitive), it equals one accepted answer.
// Never a regex: an admin-written pattern could hang the server (ReDoS).

const { isStringArray, isPlainObject } = require('./common');

const MAX_CHARS = 100;
const MAX_ACCEPTED = 20;

/** @param {string} text @param {boolean} caseSensitive */
function normalize(text, caseSensitive) {
  const collapsed = text.trim().replace(/\s+/g, ' ');
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const maxChars = config.maxChars === undefined ? MAX_CHARS : config.maxChars;
  const accepted = key.accepted === undefined ? [] : key.accepted;
  const caseSensitive = key.caseSensitive === undefined ? false : key.caseSensitive;
  const errors = {};
  if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > MAX_CHARS) errors['config.maxChars'] = `Must be 1 to ${MAX_CHARS}`;
  if (!isStringArray(accepted) || accepted.length > MAX_ACCEPTED || accepted.some((a) => a.trim().length > MAX_CHARS)) {
    errors['key.accepted'] = `Up to ${MAX_ACCEPTED} answers, each at most ${MAX_CHARS} characters`;
  }
  if (typeof caseSensitive !== 'boolean') errors['key.caseSensitive'] = 'Must be true or false';
  const cleaned = isStringArray(accepted) ? accepted.map((a) => a.trim().replace(/\s+/g, ' ')).filter(Boolean) : [];
  return {
    config: { maxChars: Number.isInteger(maxChars) ? maxChars : MAX_CHARS },
    key: { accepted: cleaned, caseSensitive: caseSensitive === true },
    errors,
  };
}

function keyProblems(q) {
  return q.key.accepted.length > 0 ? [] : ['no accepted answer'];
}

function validateResponse(q, r) {
  return isPlainObject(r) && typeof r.text === 'string' && r.text.length <= q.config.maxChars;
}

function score(q, r) {
  const given = normalize(r.text, q.key.caseSensitive);
  if (given === '') return 0;
  return q.key.accepted.some((a) => normalize(a, q.key.caseSensitive) === given) ? q.marks : 0;
}

// The student is told when spelling and case matter, so caseSensitive is part of what they see.
function studentConfig(q) {
  return { maxChars: q.config.maxChars, caseSensitive: q.key.caseSensitive };
}

function label(q, r) {
  return normalize(r.text, q.key.caseSensitive) || '(blank)';
}

module.exports = { parseDefinition, keyProblems, validateResponse, score, studentConfig, label, normalize, shuffle: null };
