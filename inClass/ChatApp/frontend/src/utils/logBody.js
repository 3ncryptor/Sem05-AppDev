/**
 * Makes request bodies safe and short for logs (buildPlan.md 9):
 * - any key that looks like a password or token is replaced with "<hidden>"
 * - long strings (base64 images) become "<N chars>"
 * Returns a new value; the input is never changed.
 */
import { LOG_STRING_LIMIT } from '../constants/config';

const SECRET_KEY = /pass(word)?|secret|token|authorization/i;
const MAX_DEPTH = 4;

/** The Inspector's request detail shows whole messages; only base64 photos are shortened. */
const INSPECTOR_LIMITS = { stringLimit: 4000, maxDepth: 12 };

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @param {{ stringLimit: number, maxDepth: number }} [limits]
 * @returns {unknown}
 */
export function safeForLog(
  value,
  depth = 0,
  limits = { stringLimit: LOG_STRING_LIMIT, maxDepth: MAX_DEPTH },
) {
  if (typeof value === 'string') {
    return value.length > limits.stringLimit ? `<${value.length} chars>` : value;
  }
  if (value === null || typeof value !== 'object') return value;
  if (depth >= limits.maxDepth) return '<nested>';
  if (Array.isArray(value)) return value.map((item) => safeForLog(item, depth + 1, limits));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? '<hidden>' : safeForLog(item, depth + 1, limits),
    ]),
  );
}

/**
 * The same redaction with room for a devtools view: secrets hidden, base64
 * shortened, everything else kept.
 * @param {unknown} value
 */
export function safeForInspector(value) {
  return safeForLog(value, 0, INSPECTOR_LIMITS);
}

/**
 * One-line preview of a body for the console.
 * @param {unknown} body
 * @returns {string} '' when there is no body
 */
export function previewBody(body) {
  if (body === undefined || body === null) return '';
  try {
    return JSON.stringify(safeForLog(body));
  } catch {
    return '<unprintable>';
  }
}

/**
 * Cuts a long preview and says how much was left out.
 * @param {string} text
 * @param {number} max
 */
export function clipText(text, max) {
  return text.length > max ? `${text.slice(0, max)}... (+${text.length - max} chars)` : text;
}
