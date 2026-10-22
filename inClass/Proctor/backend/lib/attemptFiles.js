'use strict';
// Per-attempt files under DATA_DIR/evidence/<userId>/<attemptId>/:
//   flags.json, captures.json, events.jsonl, and screen/ camera/ identity/ image folders.
// Every path is built from validated ids and server-made names, then checked with path.resolve
// to sit inside the evidence root (path traversal guard, BUILD_PLAN §19.4).

const path = require('node:path');
const store = require('./store');
const { ID_PATTERN } = require('./ids');
const { AppError } = require('./errors');

function evidenceRoot() {
  return path.resolve(store.getDataDir(), 'evidence');
}

/** @param {...string} parts @returns {string} absolute path, guaranteed inside the evidence root */
function insideRoot(...parts) {
  const root = evidenceRoot();
  const resolved = path.resolve(root, ...parts);
  if (!resolved.startsWith(root + path.sep)) throw new AppError('NOT_FOUND', "This file doesn't exist.");
  return resolved;
}

/** @param {{ id: string, userId: string }} attempt @param {...string} parts */
function attemptPath(attempt, ...parts) {
  if (!ID_PATTERN.test(attempt.userId) || !ID_PATTERN.test(attempt.id)) throw new Error('Bad id in evidence path');
  return insideRoot(attempt.userId, attempt.id, ...parts);
}

function readFlags(attempt) {
  return store.readJsonFile(attemptPath(attempt, 'flags.json'), []);
}

function writeFlags(attempt, flags) {
  return store.writeJsonFile(attemptPath(attempt, 'flags.json'), flags);
}

function readCaptures(attempt) {
  return store.readJsonFile(attemptPath(attempt, 'captures.json'), []);
}

function writeCaptures(attempt, captures) {
  return store.writeJsonFile(attemptPath(attempt, 'captures.json'), captures);
}

function readEvents(attempt) {
  return store.readLines(attemptPath(attempt, 'events.jsonl'));
}

function appendEvents(attempt, records) {
  return store.appendLines(attemptPath(attempt, 'events.jsonl'), records);
}

/** Everything the risk score and the review console need, read in parallel. */
async function readAll(attempt) {
  const [flags, captures, events] = await Promise.all([readFlags(attempt), readCaptures(attempt), readEvents(attempt)]);
  return { flags, captures, events };
}

module.exports = {
  evidenceRoot, attemptPath, readFlags, writeFlags, readCaptures, writeCaptures, readEvents, appendEvents, readAll,
};
