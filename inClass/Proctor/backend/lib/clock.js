'use strict';
// The server clock is the only clock (BUILD_PLAN §4). Everything that needs "now" asks here,
// so there is a single place to explain (and, if ever needed, to fake) time.

/** @returns {number} milliseconds since the epoch */
function now() {
  return Date.now();
}

/** @param {number} [ms] @returns {string} ISO 8601 UTC */
function iso(ms = now()) {
  return new Date(ms).toISOString();
}

/** @param {string|null|undefined} value @returns {number|null} */
function ms(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

module.exports = { now, iso, ms };
