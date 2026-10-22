'use strict';
// Passwords, sessions and the auth middleware (BUILD_PLAN §19.3).
// - Passwords: scrypt, 16-byte salt, 64-byte key, compared with timingSafeEqual.
// - Tokens: 32 random bytes sent as a Bearer token; only their SHA-256 hash is stored.
// - Login limiter: 5 failures per roll number per 15 minutes, in memory.

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const store = require('./store');
const clock = require('./clock');
const { AppError } = require('./errors');
const { LOGIN_LIMIT } = require('./constants');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const GENERIC_LOGIN_ERROR = 'Roll number or password is wrong.';

let tokenTtlMs = 12 * 3600 * 1000;

/** @param {number} hours */
function setTokenTtlHours(hours) {
  tokenTtlMs = hours * 3600 * 1000;
}

/** @param {string} password @returns {Promise<{ salt: string, passwordHash: string }>} */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return { salt: salt.toString('hex'), passwordHash: key.toString('hex') };
}

async function verifyPassword(password, salt, passwordHash) {
  const key = await scrypt(password, Buffer.from(salt, 'hex'), KEY_LENGTH);
  const expected = Buffer.from(passwordHash, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

// A fixed salt/hash pair so an unknown roll number costs the same scrypt time as a real one.
const DUMMY = { salt: '00'.repeat(16), passwordHash: '00'.repeat(KEY_LENGTH) };

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** @param {{ id: string, rollNo: string, name: string, role: string }} user */
function publicUser(user) {
  return { id: user.id, rollNo: user.rollNo, name: user.name, role: user.role };
}

function findByRollNo(rollNo) {
  const wanted = rollNo.toLowerCase();
  return store.read('users').find((u) => u.rollNo.toLowerCase() === wanted) || null;
}

// ---- login limiter ----

const failures = new Map();

function recentFailures(key, nowMs) {
  return (failures.get(key) || []).filter((t) => nowMs - t < LOGIN_LIMIT.WINDOW_MS);
}

function recordFailure(key, nowMs) {
  if (failures.size >= LOGIN_LIMIT.MAX_TRACKED) failures.delete(failures.keys().next().value);
  failures.set(key, [...recentFailures(key, nowMs), nowMs]);
}

/**
 * @param {string} rollNo @param {string} password
 * @returns {Promise<{ token: string, expiresAt: string, user: object }>}
 */
async function login(rollNo, password) {
  const nowMs = clock.now();
  const key = rollNo.toLowerCase();
  if (recentFailures(key, nowMs).length >= LOGIN_LIMIT.MAX_FAILURES) {
    throw new AppError('RATE_LIMITED', 'Too many tries. Wait 15 minutes.');
  }
  const user = findByRollNo(rollNo);
  const secret = user || DUMMY;
  const matches = await verifyPassword(password, secret.salt, secret.passwordHash);
  if (!user || !matches) {
    recordFailure(key, nowMs);
    throw new AppError('INVALID_CREDENTIALS', GENERIC_LOGIN_ERROR);
  }
  // Only someone who knows the password learns that the account is turned off.
  if (!user.active) throw new AppError('ACCOUNT_INACTIVE', 'This account is turned off. Ask your examiner.');
  failures.delete(key);
  return createSession(user, nowMs);
}

async function createSession(user, nowMs) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = clock.iso(nowMs + tokenTtlMs);
  const session = { tokenHash: hashToken(token), userId: user.id, createdAt: clock.iso(nowMs), expiresAt };
  // Expired sessions are dropped whenever we write, so the file stays small.
  await store.update('sessions', (list) => [...list.filter((s) => clock.ms(s.expiresAt) > nowMs), session]);
  await store.updateById('users', user.id, (u) => ({ ...u, lastLoginAt: clock.iso(nowMs) }));
  return { token, expiresAt, user: publicUser(user) };
}

/** @param {string} token */
async function logout(token) {
  const tokenHash = hashToken(token);
  await store.removeWhere('sessions', (s) => s.tokenHash === tokenHash);
}

/** @param {string} userId */
async function endSessionsFor(userId) {
  await store.removeWhere('sessions', (s) => s.userId === userId);
}

function bearerToken(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(header);
  return match ? match[1] : null;
}

/** Middleware: sets req.user and req.token, or answers 401. */
async function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) throw new AppError('UNAUTHENTICATED', 'Please sign in again.');
  const tokenHash = hashToken(token);
  const session = store.read('sessions').find((s) => s.tokenHash === tokenHash);
  if (!session) throw new AppError('UNAUTHENTICATED', 'Please sign in again.');
  if (clock.ms(session.expiresAt) <= clock.now()) {
    await store.removeWhere('sessions', (s) => s.tokenHash === tokenHash);
    throw new AppError('UNAUTHENTICATED', 'Please sign in again.');
  }
  const user = store.findById('users', session.userId);
  if (!user || !user.active) throw new AppError('UNAUTHENTICATED', 'Please sign in again.');
  req.user = publicUser(user);
  req.token = token;
  next();
}

/** @param {'admin'|'student'} role */
function requireRole(role) {
  return function checkRole(req, res, next) {
    if (!req.user || req.user.role !== role) throw new AppError('FORBIDDEN', "You don't have access to this.");
    next();
  };
}

module.exports = {
  hashPassword, verifyPassword, login, logout, endSessionsFor, requireAuth, requireRole,
  publicUser, findByRollNo, setTokenTtlHours,
};
