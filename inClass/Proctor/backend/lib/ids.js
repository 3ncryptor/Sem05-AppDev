'use strict';
// Random ids, codes and passwords, all from node:crypto (never Math.random).

const crypto = require('node:crypto');

/** Ids in URL paths look like `ex_<uuid>`; the main process checks the same pattern (BUILD_PLAN §18). */
const ID_PATTERN = /^[a-z]{2}_[A-Za-z0-9-]{8,40}$/;

/** No I, L, O, 0 or 1, so a password read aloud or copied by hand can't be misread. */
const UNAMBIGUOUS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** @param {string} prefix two lowercase letters, e.g. 'ex' */
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Shorter ids for options and items inside a question. */
function shortId(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

function randomGroups(groups, size) {
  const group = () => Array.from({ length: size }, () => UNAMBIGUOUS[crypto.randomInt(UNAMBIGUOUS.length)]).join('');
  return Array.from({ length: groups }, group).join('-');
}

/** @returns {string} a one-time password like K7Q4-M2XB-9F3C */
function generatePassword() {
  return randomGroups(3, 4);
}

/** @returns {string} an attempt code like ATH-7K4Q-9M2X */
function attemptCode() {
  return `ATH-${randomGroups(2, 4)}`;
}

/**
 * Fisher–Yates shuffle with crypto.randomInt. Returns a new array.
 * @template T
 * @param {readonly T[]} list
 * @returns {T[]}
 */
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

module.exports = { ID_PATTERN, newId, shortId, generatePassword, attemptCode, shuffle };
