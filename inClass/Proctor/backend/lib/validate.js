'use strict';
// Small hand-written validator (BUILD_PLAN §9 "Inputs"). A schema is a plain object such as
//   { title: { type: 'string', required: true, max: 120 } }
// check() returns a cleaned copy (unknown keys dropped, strings trimmed) plus field errors keyed by path.

const { validationError } = require('./errors');
const { ID_PATTERN } = require('./ids');

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkString(s, value, path, errors) {
  if (typeof value !== 'string') return fail(errors, path, 'Must be text');
  const text = s.trim === false ? value : value.trim();
  if (s.min !== undefined && text.length < s.min) return fail(errors, path, s.min === 1 ? 'Required' : `At least ${s.min} characters`);
  if (s.max !== undefined && text.length > s.max) return fail(errors, path, `At most ${s.max} characters`);
  if (s.pattern && text !== '' && !s.pattern.test(text)) return fail(errors, path, s.patternMessage || 'Has an invalid format');
  if (s.enum && !s.enum.includes(text)) return fail(errors, path, `Must be one of: ${s.enum.join(', ')}`);
  return text;
}

function checkNumber(s, value, path, errors) {
  const n = s.coerce && typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fail(errors, path, 'Must be a number');
  if (s.type === 'integer' && !Number.isInteger(n)) return fail(errors, path, 'Must be a whole number');
  if (s.min !== undefined && n < s.min) return fail(errors, path, `Must be at least ${s.min}`);
  if (s.max !== undefined && n > s.max) return fail(errors, path, `Must be at most ${s.max}`);
  return n;
}

function checkBoolean(s, value, path, errors) {
  if (s.coerce && (value === 'true' || value === 'false')) return value === 'true';
  if (typeof value !== 'boolean') return fail(errors, path, 'Must be true or false');
  return value;
}

function checkDate(s, value, path, errors) {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    return fail(errors, path, 'Must be a date and time (ISO 8601)');
  }
  return new Date(value).toISOString();
}

function checkId(s, value, path, errors) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return fail(errors, path, 'Is not a valid id');
  return value;
}

function checkObject(s, value, path, errors) {
  if (!isPlainObject(value)) return fail(errors, path, 'Must be an object');
  if (!s.fields) return value; // free-form object; the service checks it
  const entries = Object.entries(s.fields).map(([key, child]) => [key, checkValue(child, value[key], join(path, key), errors)]);
  return Object.fromEntries(entries.filter(([, v]) => v !== undefined));
}

function checkArray(s, value, path, errors) {
  if (!Array.isArray(value)) return fail(errors, path, 'Must be a list');
  if (s.min !== undefined && value.length < s.min) return fail(errors, path, `Needs at least ${s.min}`);
  if (s.max !== undefined && value.length > s.max) return fail(errors, path, `At most ${s.max} allowed`);
  return s.items ? value.map((item, i) => checkValue(s.items, item, join(path, String(i)), errors)) : value;
}

const CHECKERS = {
  string: checkString, number: checkNumber, integer: checkNumber, boolean: checkBoolean,
  date: checkDate, id: checkId, object: checkObject, array: checkArray, any: (s, v) => v,
};

function checkValue(schema, value, path, errors) {
  if (value === undefined) {
    if (schema.required) fail(errors, path, 'Required');
    return schema.default;
  }
  if (value === null) {
    if (schema.nullable) return null;
    return fail(errors, path, schema.required ? 'Required' : 'Must not be null');
  }
  return CHECKERS[schema.type](schema, value, path, errors);
}

function join(path, key) {
  return path ? `${path}.${key}` : key;
}

// `errors` is a local accumulator created by check(), never store data, so adding to it is fine.
function fail(errors, path, message) {
  if (!errors[path || 'body']) errors[path || 'body'] = message;
  return undefined;
}

/**
 * Checks a value against a schema of fields.
 * @param {Record<string, object>} fields
 * @param {unknown} value
 * @returns {{ value: Record<string, unknown>, errors: Record<string,string> }}
 */
function check(fields, value) {
  const errors = {};
  const cleaned = checkValue({ type: 'object', fields }, value === undefined ? {} : value, '', errors);
  return { value: cleaned || {}, errors };
}

/**
 * Express middleware: checks body and query and puts the cleaned values on req.valid.
 * @param {{ body?: Record<string, object>, query?: Record<string, object> }} schemas
 */
function validate(schemas) {
  return function validateRequest(req, res, next) {
    const body = schemas.body ? check(schemas.body, req.body) : { value: {}, errors: {} };
    const query = schemas.query ? check(schemas.query, { ...req.query }) : { value: {}, errors: {} };
    const errors = { ...body.errors, ...query.errors };
    if (Object.keys(errors).length > 0) return next(validationError(errors));
    req.valid = { body: body.value, query: query.value };
    return next();
  };
}

module.exports = { validate, check, isPlainObject };
