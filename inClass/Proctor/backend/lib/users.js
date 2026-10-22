'use strict';
// Student accounts (BUILD_PLAN §6.4, SCREENS A8). Generated passwords are returned exactly once.

const store = require('./store');
const clock = require('./clock');
const { newId, generatePassword } = require('./ids');
const { validationError, notFound } = require('./errors');
const { hashPassword, endSessionsFor, findByRollNo } = require('./auth');

const ROLL_NO = /^[A-Za-z0-9._-]{2,32}$/;

function lastActive(user, attempts) {
  const times = [user.lastLoginAt, ...attempts.map((a) => a.lastSeenAt)].filter(Boolean);
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
}

function studentRow(user) {
  const attempts = store.read('attempts').filter((a) => a.userId === user.id);
  return {
    id: user.id, rollNo: user.rollNo, name: user.name, active: user.active,
    attempts: attempts.length, lastActiveAt: lastActive(user, attempts), createdAt: user.createdAt,
  };
}

function getStudent(userId) {
  const user = store.findById('users', userId);
  if (!user || user.role !== 'student') throw notFound('This student');
  return user;
}

function listStudents() {
  const rows = store.read('users').filter((u) => u.role === 'student').map(studentRow);
  return { users: rows.toSorted((a, b) => a.rollNo.localeCompare(b.rollNo)) };
}

async function newStudentRecord(rollNo, name, password) {
  return { id: newId('us'), rollNo, name, role: 'student', ...(await hashPassword(password)), active: true, createdAt: clock.iso(), lastLoginAt: null };
}

/** @param {{ rollNo: string, name: string, password?: string }} input */
async function createStudent(input) {
  if (!ROLL_NO.test(input.rollNo)) throw validationError({ rollNo: 'Letters, digits, dots, dashes; 2–32 characters' });
  if (findByRollNo(input.rollNo)) throw validationError({ rollNo: 'This roll number already exists' });
  const password = input.password || generatePassword();
  const user = await store.insert('users', await newStudentRecord(input.rollNo, input.name, password));
  return { user: studentRow(user), password: input.password ? null : password };
}

/** Name and active. Turning an account off signs it out everywhere. */
async function updateStudent(userId, input) {
  getStudent(userId);
  const saved = await store.updateById('users', userId, (u) => ({ ...u, ...input }));
  if (input.active === false) await endSessionsFor(userId);
  return { user: studentRow(saved) };
}

async function resetPassword(userId) {
  getStudent(userId);
  const password = generatePassword();
  const secret = await hashPassword(password);
  await store.updateById('users', userId, (u) => ({ ...u, ...secret }));
  await endSessionsFor(userId);
  return { password };
}

function checkRow(row, index, seen) {
  const rollNo = typeof row.rollNo === 'string' ? row.rollNo.trim() : '';
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  const base = { row: index + 1, rollNo, name };
  if (!rollNo) return { ...base, status: 'problem', problem: 'roll number missing' };
  if (!ROLL_NO.test(rollNo)) return { ...base, status: 'problem', problem: 'roll number has invalid characters' };
  if (!name || name.length > 80) return { ...base, status: 'problem', problem: name ? 'name too long' : 'name missing' };
  if (seen.has(rollNo.toLowerCase())) return { ...base, status: 'problem', problem: 'appears twice in the file' };
  if (findByRollNo(rollNo)) return { ...base, status: 'exists', problem: 'already exists' };
  return { ...base, status: 'ready', problem: null };
}

/** Checks every row; with dryRun false, creates the ready ones and returns their passwords once. */
async function importStudents(rows, dryRun) {
  const checked = rows.reduce((acc, row, i) => {
    const result = checkRow(row, i, acc.seen);
    return { list: [...acc.list, result], seen: new Set([...acc.seen, result.rollNo.toLowerCase()]) };
  }, { list: [], seen: new Set() }).list;
  const counts = {
    ready: checked.filter((r) => r.status === 'ready').length,
    exists: checked.filter((r) => r.status === 'exists').length,
    problems: checked.filter((r) => r.status === 'problem').length,
  };
  if (dryRun) return { dryRun: true, rows: checked, counts, created: [] };
  const ready = checked.filter((r) => r.status === 'ready');
  const created = await Promise.all(ready.map(async (r) => ({ ...r, password: generatePassword() })));
  const records = await Promise.all(created.map((r) => newStudentRecord(r.rollNo, r.name, r.password)));
  await store.update('users', (list) => [...list, ...records]);
  return { dryRun: false, rows: checked, counts, created: created.map(({ rollNo, name, password }) => ({ rollNo, name, password })) };
}

module.exports = { listStudents, createStudent, updateStudent, resetPassword, importStudents, newStudentRecord };
