'use strict';
// matching: pick a right-side match for each left item. Marks are split per correct pair.
// The builder lists each correct match next to its left item, so the right side is ALWAYS shuffled.

const { parseItems, listProblems, orderBy, isPlainObject } = require('./common');

const MAX_LEFT = 8;
const MAX_RIGHT = 12;

function parsePairs(rawPairs, leftIds, rightIds) {
  if (rawPairs === undefined) return { pairs: {}, errors: {} };
  if (!isPlainObject(rawPairs)) return { pairs: {}, errors: { 'key.pairs': 'Must map left ids to right ids' } };
  const entries = Object.entries(rawPairs);
  const valid = entries.every(([l, r]) => leftIds.includes(l) && (r === null || rightIds.includes(r)));
  if (!valid) return { pairs: {}, errors: { 'key.pairs': 'Every pair must use items from the lists' } };
  return { pairs: Object.fromEntries(entries.filter(([, r]) => r !== null)), errors: {} };
}

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const left = parseItems(config.left, 'lt', 'config.left', MAX_LEFT);
  const right = parseItems(config.right, 'rt', 'config.right', MAX_RIGHT);
  const { pairs, errors } = parsePairs(key.pairs, left.items.map((i) => i.id), right.items.map((i) => i.id));
  return {
    config: { left: left.items, right: right.items },
    key: { pairs },
    errors: { ...left.errors, ...right.errors, ...errors },
  };
}

function keyProblems(q) {
  const problems = [...listProblems(q.config.left, 2, 'left items'), ...listProblems(q.config.right, 2, 'right items')];
  const unmatched = q.config.left.filter((l) => !q.key.pairs[l.id]);
  return unmatched.length ? [...problems, 'a pair has no match'] : problems;
}

function validateResponse(q, r) {
  if (!isPlainObject(r) || !isPlainObject(r.pairs)) return false;
  const leftIds = q.config.left.map((i) => i.id);
  const rightIds = q.config.right.map((i) => i.id);
  return Object.entries(r.pairs).every(([l, v]) => leftIds.includes(l) && (v === null || rightIds.includes(v)));
}

function score(q, r) {
  const correct = q.config.left.filter((l) => r.pairs[l.id] === q.key.pairs[l.id]).length;
  return q.marks * (correct / q.config.left.length);
}

function studentConfig(q, order) {
  return { left: q.config.left, right: orderBy(q.config.right, order) };
}

/** The wrong pairs, e.g. "let → Declares a variable". */
function label(q, r) {
  const rightText = new Map(q.config.right.map((i) => [i.id, i.text]));
  const wrong = q.config.left
    .filter((l) => r.pairs[l.id] && r.pairs[l.id] !== q.key.pairs[l.id])
    .map((l) => `${l.text} → ${rightText.get(r.pairs[l.id])}`);
  return wrong.length ? wrong.join('; ') : 'incomplete';
}

module.exports = {
  parseDefinition, keyProblems, validateResponse, score, studentConfig, label,
  shuffle: { list: 'right', always: true },
};
