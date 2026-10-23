'use strict';
// Server configuration from environment variables, checked once at startup (BUILD_PLAN §19.2).
// A bad value stops the server with a clear message instead of failing later in a request.

const path = require('node:path');

/**
 * @typedef {object} Config
 * @property {number} port
 * @property {string} host
 * @property {string} dataDir      absolute path of the JSON files
 * @property {string} evidenceDir  absolute path of uploaded evidence (BUILD_PLAN §24)
 * @property {number} tokenTtlHours
 */

function readInt(name, fallback, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max} (got "${raw}")`);
  }
  return value;
}

function readHost() {
  const host = process.env.HOST || '127.0.0.1';
  if (!/^[A-Za-z0-9.:-]+$/.test(host)) throw new Error(`HOST is not a valid host name (got "${host}")`);
  return host;
}

/** Evidence lives at the Proctor root (evidence/server), next to app/ and backend/, unless EVIDENCE_DIR says otherwise. */
function readEvidenceDir() {
  const dir = path.resolve(process.env.EVIDENCE_DIR || path.join(__dirname, '..', 'evidence', 'server'));
  if (dir === path.parse(dir).root) throw new Error('EVIDENCE_DIR must not be the file-system root');
  return dir;
}

/** @returns {Config} */
function loadConfig() {
  return Object.freeze({
    port: readInt('PORT', 3000, 1, 65535),
    host: readHost(),
    dataDir: path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data')),
    evidenceDir: readEvidenceDir(),
    tokenTtlHours: readInt('TOKEN_TTL_HOURS', 12, 1, 168),
  });
}

module.exports = { loadConfig };
