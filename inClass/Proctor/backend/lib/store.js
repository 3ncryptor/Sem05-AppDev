'use strict';
// JSON file store (BUILD_PLAN §19.4).
// - read(name) returns the cached array, loaded from disk once at startup.
// - update(name, fn) queues on a per-file promise chain; fn must RETURN A NEW ARRAY.
//   The new array is written to name.json.tmp and renamed over name.json, so a crash mid-write
//   leaves the old file intact. Only then is the cache swapped.
// - Everything handed out is deep-frozen, so accidental mutation throws instead of silently
//   corrupting the cache.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const FILES = Object.freeze(['users', 'sessions', 'exams', 'attempts']);

let dataDir = null;
const cache = new Map();
const queues = new Map();

function deepFreeze(value) {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function filePath(name) {
  if (!FILES.includes(name)) throw new Error(`Unknown store file: ${name}`);
  return path.join(dataDir, `${name}.json`);
}

/** Loads every file into memory. Missing files start as empty arrays. @param {string} dir */
function init(dir) {
  dataDir = dir;
  fs.mkdirSync(dir, { recursive: true });
  FILES.forEach((name) => {
    const file = filePath(name);
    const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    if (!Array.isArray(list)) throw new Error(`${file} must contain a JSON array`);
    cache.set(name, deepFreeze(list));
  });
}

function getDataDir() {
  return dataDir;
}

/** Runs task after every earlier task for the same key, even if one of them failed. */
function enqueue(key, task) {
  const previous = queues.get(key) || Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  queues.set(key, run.catch(() => undefined));
  return run;
}

async function writeFileAtomic(file, text) {
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, text);
  await fsp.rename(tmp, file);
}

/** @param {string} name @returns {readonly object[]} */
function read(name) {
  filePath(name);
  return cache.get(name);
}

/**
 * @param {string} name
 * @param {(current: readonly object[]) => object[]} fn returns the next array
 * @returns {Promise<readonly object[]>}
 */
function update(name, fn) {
  return enqueue(name, async () => {
    const current = read(name);
    const next = fn(current);
    if (!Array.isArray(next)) throw new Error(`store.update(${name}) must return an array`);
    if (next === current) return current;
    await writeFileAtomic(filePath(name), JSON.stringify(next, null, 2));
    const frozen = deepFreeze(next);
    cache.set(name, frozen);
    return frozen;
  });
}

/** @param {string} name @param {string} id */
function findById(name, id) {
  return read(name).find((item) => item.id === id) || null;
}

/** @param {string} name @param {object} record */
async function insert(name, record) {
  await update(name, (list) => [...list, record]);
  return findById(name, record.id);
}

/**
 * Replaces one record with fn(record). Returns the new record, or null if the id is unknown.
 * @param {string} name @param {string} id @param {(record: object) => object} fn
 */
async function updateById(name, id, fn) {
  let found = false;
  await update(name, (list) => list.map((item) => {
    if (item.id !== id) return item;
    found = true;
    return fn(item);
  }));
  return found ? findById(name, id) : null;
}

/** @param {string} name @param {(record: object) => boolean} predicate @returns {Promise<number>} removed */
async function removeWhere(name, predicate) {
  const before = read(name).length;
  const after = await update(name, (list) => {
    const kept = list.filter((item) => !predicate(item));
    return kept.length === list.length ? list : kept;
  });
  return before - after.length;
}

// ---- per-attempt files under evidence/ (flags.json, captures.json, events.jsonl) ----

/** @param {string} file absolute path @param {unknown} fallback */
async function readJsonFile(file, fallback) {
  try {
    return deepFreeze(JSON.parse(await fsp.readFile(file, 'utf8')));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

/** @param {string} file absolute path @param {unknown} value */
function writeJsonFile(file, value) {
  return enqueue(file, async () => {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, JSON.stringify(value, null, 2));
  });
}

/** Appends objects as JSON lines. @param {string} file @param {object[]} objects */
function appendLines(file, objects) {
  if (objects.length === 0) return Promise.resolve();
  return enqueue(file, async () => {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.appendFile(file, objects.map((o) => `${JSON.stringify(o)}\n`).join(''));
  });
}

/** @param {string} file @returns {Promise<object[]>} */
async function readLines(file) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    return deepFreeze(text.split('\n').filter(Boolean).map((line) => JSON.parse(line)));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

module.exports = {
  FILES, init, getDataDir, read, update, findById, insert, updateById, removeWhere,
  readJsonFile, writeJsonFile, appendLines, readLines, writeFileAtomic,
};
