'use strict';
// Two folders per attempt (BUILD_PLAN §25):
//   records: DATA_DIR/records/<userId>/<attemptId>/  flags.json, captures.json, events.jsonl
//   images:  backend/screenshots/<Candidate_Name>/<Test_Name>/{webcam,screen}/<Candidate_Name>-<Test_Name>-<time>.jpg
// Names are cleaned to letters and digits in any script, plus '_' (so '-' only ever separates the parts of a
// file name), then every path is checked with path.resolve to sit inside its root (path traversal guard).
// Each capture record keeps the path it was saved under, so renaming a student or exam later doesn't lose it.

const path = require('node:path');
const store = require('./store');
const { ID_PATTERN } = require('./ids');
const { AppError } = require('./errors');

const MAX_NAME_PART = 40;
// The API calls the webcam kind "camera"; on disk the folder says what it is. The identity photo is a webcam photo too.
const IMAGE_FOLDER = Object.freeze({ camera: 'webcam', screen: 'screen', identity: 'webcam' });

/** "Aryan Vibhuti" → "Aryan_Vibhuti", "आर्यन शर्मा" keeps its letters. Never empty, never "." or "..", at most 40 characters. */
function namePart(value) {
  const cleaned = String(value || '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  return Array.from(cleaned).slice(0, MAX_NAME_PART).join('').replace(/_+$/, '') || 'unknown';
}

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

/** The candidate's and the test's names as they appear on disk. @param {{ userId: string, examId: string }} attempt */
function imageNames(attempt) {
  const user = store.findById('users', attempt.userId);
  const exam = store.findById('exams', attempt.examId);
  if (!user || !exam) throw new Error('Unknown student or exam for image path');
  return { candidate: namePart(user.name), test: namePart(exam.title) };
}

/**
 * Image file for one attempt, in a folder a person can browse: candidate, then test, then webcam or screen.
 * A second attempt at the same test lands in the same folder; file names carry the time, so nothing clashes.
 * @param {{ userId: string, examId: string }} attempt @param {string} kind @param {string} fileName
 */
function imageRelativePath(attempt, kind, fileName) {
  const folder = IMAGE_FOLDER[kind];
  if (!folder) throw new Error('Bad kind in image path');
  const { candidate, test } = imageNames(attempt);
  return [candidate, test, folder, fileName].join('/');
}

/** Absolute path of an image from the relative path stored in its capture record. */
function storedImagePath(relativePath) {
  return insideRoot('images', ...String(relativePath).split('/'));
}

function imagePath(attempt, kind, fileName) {
  return storedImagePath(imageRelativePath(attempt, kind, fileName));
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
  setRoots, attemptPath, imageNames, imagePath, imageRelativePath, storedImagePath, readFlags, writeFlags, readCaptures, writeCaptures, readEvents, appendEvents, readAll,
};
