'use strict';
// ordering: put items in order.
//   exact: full marks only for the whole order.
//   positional: marks × (items in the right place / items).
// The builder stores items in the correct order, so students ALWAYS get them shuffled.

const { parseItems, listProblems, orderBy, isPermutation, isPlainObject } = require('./common');

const MAX_ITEMS = 8;
const SCORING = ['positional', 'exact'];

function parseDefinition(input) {
  const config = isPlainObject(input.config) ? input.config : {};
  const key = isPlainObject(input.key) ? input.key : {};
  const { items, errors } = parseItems(config.items, 'it', 'config.items', MAX_ITEMS);
  const scoring = config.scoring === undefined ? 'positional' : config.scoring;
  const ids = items.map((i) => i.id);
  // Without an explicit key, the order the admin typed the items in is the correct order.
  const order = key.order === undefined ? ids : key.order;
  const extra = {};
  if (!SCORING.includes(scoring)) extra['config.scoring'] = `Must be one of: ${SCORING.join(', ')}`;
  if (!isPermutation(order, ids)) extra['key.order'] = 'Must list every item exactly once';
  return { config: { items, scoring }, key: { order: isPermutation(order, ids) ? order : ids }, errors: { ...errors, ...extra } };
}

function keyProblems(q) {
  return listProblems(q.config.items, 2, 'items');
}

function validateResponse(q, r) {
  return isPlainObject(r) && isPermutation(r.order, q.config.items.map((i) => i.id));
}

function score(q, r) {
  const inPlace = r.order.filter((id, i) => q.key.order[i] === id).length;
  if (q.config.scoring === 'exact') return inPlace === q.key.order.length ? q.marks : 0;
  return q.marks * (inPlace / q.key.order.length);
}

function studentConfig(q, order) {
  return { items: orderBy(q.config.items, order) };
}

/** e.g. "2 1 3 4": the correct position of each item, in the order the student put them. */
function label(q, r) {
  return r.order.map((id) => q.key.order.indexOf(id) + 1).join(' ');
}

module.exports = {
  parseDefinition, keyProblems, validateResponse, score, studentConfig, label,
  shuffle: { list: 'items', always: true },
};
