'use strict';
// Short constructors for seed questions. Each one builds builder-style input and runs it through
// the same parseQuestion() the admin API uses, so seed questions obey exactly the same rules.

const { shortId } = require('../../lib/ids');
const { parseQuestion } = require('../../lib/questions');

const items = (texts, prefix) => texts.map((text) => ({ id: shortId(prefix), text }));

function q(input) {
  return parseQuestion(input, null);
}

function single(topic, marks, text, options, correct, explanation) {
  const opts = items(options, 'op');
  return q({ type: 'single', topic, marks, text, explanation, config: { options: opts }, key: { optionId: opts[correct].id } });
}

function multi(topic, marks, text, options, correct, explanation, scoring = 'partial') {
  const opts = items(options, 'op');
  return q({ type: 'multi', topic, marks, text, explanation, config: { options: opts, scoring }, key: { optionIds: correct.map((i) => opts[i].id) } });
}

function trueFalse(topic, marks, text, value, explanation) {
  return q({ type: 'true_false', topic, marks, text, explanation, key: { value } });
}

function shortText(topic, marks, text, accepted, caseSensitive, explanation) {
  return q({ type: 'short_text', topic, marks, text, explanation, config: { maxChars: 100 }, key: { accepted, caseSensitive } });
}

function numeric(topic, marks, text, answer, tolerance, unit, explanation) {
  return q({ type: 'numeric', topic, marks, text, explanation, config: { unit }, key: { answer, tolerance } });
}

/** `inOrder` lists the items in the correct order; students get them shuffled. */
function ordering(topic, marks, text, inOrder, explanation, scoring = 'positional') {
  const list = items(inOrder, 'it');
  return q({ type: 'ordering', topic, marks, text, explanation, config: { items: list, scoring }, key: { order: list.map((i) => i.id) } });
}

/** `pairs` is [[left, right], …]; `extras` are right-side distractors. */
function matching(topic, marks, text, pairs, extras, explanation) {
  const left = items(pairs.map((p) => p[0]), 'lt');
  const right = items([...pairs.map((p) => p[1]), ...extras], 'rt');
  const key = Object.fromEntries(left.map((l, i) => [l.id, right[i].id]));
  return q({ type: 'matching', topic, marks, text, explanation, config: { left, right }, key: { pairs: key } });
}

module.exports = { single, multi, trueFalse, shortText, numeric, ordering, matching };
