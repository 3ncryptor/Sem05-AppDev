'use strict';
// Request pipeline pieces (BUILD_PLAN §19.1) and the { ok, data, error } envelope.

const crypto = require('node:crypto');
const { AppError, notFound } = require('./errors');
const { ID_PATTERN } = require('./ids');

function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

/** One line per request. Never bodies, query strings, passwords, tokens or images. */
function logger(req, res, next) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const pathOnly = req.originalUrl.split('?')[0];
    const user = req.user ? req.user.id : '-';
    process.stdout.write(`${new Date().toISOString()} ${req.id} ${req.method} ${pathOnly} ${res.statusCode} ${ms.toFixed(1)}ms ${user}\n`);
  });
  next();
}

/** Small hardening headers; the only client is our own main process. */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** @param {import('express').Response} res @param {unknown} data @param {number} [status] */
function sendOk(res, data, status = 200) {
  res.status(status).json({ ok: true, data, error: null });
}

/**
 * Router param check: any id in the path that doesn't look like one of ours is a plain 404,
 * before a handler or a file path ever sees it.
 */
function checkIdParam(req, res, next, value) {
  if (!ID_PATTERN.test(value)) return next(notFound());
  return next();
}

function notFoundHandler(req, res, next) {
  next(new AppError('NOT_FOUND', 'There is no such endpoint.'));
}

function bodyParserError(err) {
  if (err.type === 'entity.too.large') return new AppError('PAYLOAD_TOO_LARGE', 'The request is too large.');
  if (err.type === 'entity.parse.failed') return new AppError('VALIDATION_FAILED', 'The request body is not valid JSON.', { fields: {} });
  if (err.status >= 400 && err.status < 500 && err.expose) {
    return new AppError('VALIDATION_FAILED', 'The request could not be read.', { fields: {} });
  }
  return null;
}

// Express recognises error handlers by their four parameters, so `next` must stay.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const known = err instanceof AppError ? err : bodyParserError(err);
  if (known) {
    res.status(known.status).json({ ok: false, data: null, error: known.toJSON() });
    return;
  }
  process.stderr.write(`${new Date().toISOString()} ${req.id} ERROR ${err && err.stack ? err.stack : err}\n`);
  res.status(500).json({
    ok: false,
    data: null,
    error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server.', requestId: req.id },
  });
}

module.exports = { requestId, logger, securityHeaders, sendOk, checkIdParam, notFoundHandler, errorHandler };
