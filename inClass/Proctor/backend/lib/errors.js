'use strict';
// One error type for every expected failure. Its code picks the HTTP status (BUILD_PLAN §20),
// so a service only says what went wrong and never thinks about HTTP.

const STATUS_BY_CODE = Object.freeze({
  VALIDATION_FAILED: 400,
  INVALID_RESPONSE: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  ACCOUNT_INACTIVE: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RESULTS_NOT_AVAILABLE: 404,
  EXAM_NOT_OPEN: 409,
  NO_ATTEMPTS_LEFT: 409,
  ATTEMPT_NOT_ACTIVE: 409,
  ATTEMPT_HELD: 409,
  TIME_UP: 409,
  EXAM_LOCKED: 409,
  PAYLOAD_TOO_LARGE: 413,
  NOT_PUBLISHABLE: 422,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
});

class AppError extends Error {
  /**
   * @param {keyof typeof STATUS_BY_CODE} code
   * @param {string} message  safe to show to the user
   * @param {{ fields?: Record<string,string>, [extra: string]: unknown }} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code] || 500;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, ...this.details };
  }
}

/** @param {Record<string,string>} fields */
function validationError(fields, message = 'Some fields need attention.') {
  return new AppError('VALIDATION_FAILED', message, { fields });
}

function notFound(what = 'This') {
  return new AppError('NOT_FOUND', `${what} doesn't exist any more.`);
}

module.exports = { AppError, STATUS_BY_CODE, validationError, notFound };
