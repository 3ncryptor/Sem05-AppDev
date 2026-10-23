'use strict';
// Two folders per attempt (BUILD_PLAN §25):
//   records: DATA_DIR/records/<userId>/<attemptId>/  flags.json, captures.json, events.jsonl
//   images:  backend/proctorImages/<rollNo>/<attemptCode>/{webcam,screen,identity}/<time>_<seq>.jpg
// Every path is built from validated ids and server-made names, then checked with path.resolve
// to sit inside its root (path traversal guard, BUILD_PLAN §19.4).

const path = require('node:path');
const store = require('./store');
const { ID_PATTERN } = require('./ids');
const { AppError } = require('./errors');

const ROLL_NO = /^[A-Za-z0-9_-]{1,32}$/;
const ATTEMPT_CODE = /^ATH-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
// The API calls the webcam kind "camera"; on disk the folder says what it is.
const IMAGE_FOLDER = Object.freeze({ camera: 'webcam', screen: 'screen', identity: 'identity' });

let roots = null;

/** Set once at startup. Folders inside the roots are created lazily on first write. */
function setRoots({ records, images }) {
  roots = Object.freeze({ records: path.resolve(records), images: path.resolve(images) });
}

/** @param {'records'|'images'} which @param {...string} parts @returns {string} absolute path inside that root */
function insideRoot(which, ...parts) {
  if (!roots) throw new Error('Attempt folders not configured');
  const root = roots[which];
  const resolved = path.resolve(root, ...parts);
  if (!resolved.startsWith(root + path.sep)) throw new AppError('NOT_FOUND', "This file doesn't exist.");
  return resolved;
}

/** Record files (JSON) for one attempt. @param {{ id: string, userId: string }} attempt @param {...string} parts */
function attemptPath(attempt, ...parts) {
  if (!ID_PATTERN.test(attempt.userId) || !ID_PATTERN.test(attempt.id)) throw new Error('Bad id in record path');
  return insideRoot('records', attempt.userId, attempt.id, ...parts);
}

/**
 * Image file for one attempt, in a folder a person can browse: roll number, then attempt code.
 * @param {{ userId: string, code: string }} attempt @param {string} kind @param {string} fileName
 */
function imagePath(attempt, kind, fileName) {
  const user = store.findById('users', attempt.userId);
  const folder = IMAGE_FOLDER[kind];
  if (!user || !ROLL_NO.test(user.rollNo) || !ATTEMPT_CODE.test(attempt.code) || !folder) {
    throw new Error('Bad name in image path');
  }
  return insideRoot('images', user.rollNo, attempt.code, folder, fileName);
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
  setRoots, attemptPath, imagePath, readFlags, writeFlags, readCaptures, writeCaptures, readEvents, appendEvents, readAll,
};
