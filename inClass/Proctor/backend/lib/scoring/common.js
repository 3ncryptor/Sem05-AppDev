'use strict';
// Helpers shared by the seven question-type modules.

const { shortId } = require('../ids');
const { isPlainObject } = require('../validate');

const ITEM_TEXT_MAX = 500;
const CLIENT_ITEM_ID = /^[a-z]{2}_[A-Za-z0-9-]{1,40}$/;

/**
 * Checks a list of { id?, text } items (options, ordering items, matching sides).
 * Items without an id get a new one, so the builder can add an option and save it in one step.
 * @param {unknown} list @param {string} prefix @param {string} path @param {number} max
 * @returns {{ items: { id: string, text: string }[], errors: Record<string,string> }}
 */
function parseItems(list, prefix, path, max) {
  if (list === undefined) return { items: [], errors: {} };
  if (!Array.isArray(list)) return { items: [], errors: { [path]: 'Must be a list' } };
  if (list.length > max) return { items: [], errors: { [path]: `At most ${max} allowed` } };
  const errors = {};
  const items = list.map((raw, i) => {
    const item = isPlainObject(raw) ? raw : {};
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (typeof item.text !== 'string') errors[`${path}.${i}.text`] = 'Must be text';
    if (text.length > ITEM_TEXT_MAX) errors[`${path}.${i}.text`] = `At most ${ITEM_TEXT_MAX} characters`;
    const id = typeof item.id === 'string' && CLIENT_ITEM_ID.test(item.id) ? item.id : shortId(prefix);
    return { id, text };
  });
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) errors[path] = 'Two items have the same id';
  return { items, errors };
}

/** Problems shared by every list: too few entries, blank text. */
function listProblems(items, min, noun) {
  const problems = [];
  if (items.length < min) problems.push(`needs at least ${min} ${noun}`);
  if (items.some((item) => item.text === '')) problems.push(`one of the ${noun} has no text`);
  return problems;
}

/** Puts items in the order of `orderIds` (this attempt's shuffle). Unknown ids are ignored. */
function orderBy(items, orderIds) {
  if (!Array.isArray(orderIds)) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = orderIds.map((id) => byId.get(id)).filter(Boolean);
  const missing = items.filter((item) => !orderIds.includes(item.id));
  return [...ordered, ...missing];
}

/** "A", "B", … for an option at index i, as admins see them in the builder. */
function letter(i) {
  return String.fromCharCode(65 + i);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPermutation(order, ids) {
  return isStringArray(order) && order.length === ids.length && new Set(order).size === ids.length
    && order.every((id) => ids.includes(id));
}

module.exports = { parseItems, listProblems, orderBy, letter, isStringArray, isPermutation, isPlainObject };
