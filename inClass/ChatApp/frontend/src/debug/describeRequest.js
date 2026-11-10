/**
 * describeRequest: turns a raw request into words a person can read, for the
 * Inspector and the terminal (buildPlan.md 13, V4).
 *
 *   before:  -> POST /message #fy250i {"conversation_id":"..."}
 *            <- 201 POST /message #fy250i 84ms
 *   after:   sent a message · ok 201 · 84 ms   POST /message #fy250i
 *
 * Plain words first, technical detail second. All pure, so it is unit tested.
 */
import { formatLogTime } from '../utils/format';

/**
 * @param {object} request
 * @param {string} request.method
 * @param {string} request.path
 * @param {Record<string, unknown>} [request.query]
 * @param {any} [request.body] the original body (only `type`, `name` and `file_id` are read)
 * @param {boolean} [request.isPoll]
 * @param {boolean} [request.auth] false for the unauthenticated server test
 * @returns {string}
 */
export function describeRequest({ method, path, query, body, isPoll = false, auth = true }) {
  const route = `${method} ${path.startsWith('/file/') ? '/file/:id' : path}`;
  switch (route) {
    case 'GET /user':
      if (!auth) return 'tested the server';
      return isPoll ? 'checked the people list' : 'loaded people';
    case 'GET /user/profile':
      return 'checked your account';
    case 'GET /conversation':
      return isPoll ? 'checked for new chats' : 'loaded your chats';
    case 'POST /conversation':
      return body?.type === 'GROUP' ? `created the group "${body.name}"` : 'started a chat';
    case 'GET /message':
      if (query?.from_message_cursor) return 'loaded older messages';
      return isPoll ? 'checked for new messages' : 'opened a chat';
    case 'POST /message':
      return body?.file_id ? 'sent a photo' : 'sent a message';
    case 'POST /file':
      return 'uploaded a photo';
    case 'GET /file/:id':
      return 'downloaded a photo';
    case 'GET /debug/logs':
      return 'fetched server logs';
    default:
      return `${method} ${path}`;
  }
}

const HTTP_OUTCOMES = { 401: 'wrong password', 403: 'not allowed', 404: 'not found' };
const SERVER_ERROR = 500;
const BAD_REQUEST = 400;

/**
 * @param {{ status?: number, kind?: string, message?: string }} result
 * @returns {string} "ok", "wrong password", "server unreachable", ...
 */
export function describeOutcome({ status, kind, message }) {
  if (kind === 'timeout') return 'timed out';
  if (kind === 'network') {
    return message === 'Simulated offline' ? 'offline (simulated)' : 'server unreachable';
  }
  if (!kind && status < BAD_REQUEST) return 'ok';
  if (HTTP_OUTCOMES[status]) return HTTP_OUTCOMES[status];
  if (status >= SERVER_ERROR) return 'server error';
  return message ? `rejected: ${message}` : 'rejected';
}

/**
 * How many items a response holds, when it is a list or a page of one.
 * @param {unknown} data
 * @returns {number | null}
 */
export function resultCount(data) {
  if (Array.isArray(data)) return data.length;
  if (data && Array.isArray(data.data)) return data.data.length;
  return null;
}

/**
 * @param {object} parts
 * @param {string} parts.phrase from describeRequest
 * @param {string} [parts.outcome] from describeOutcome; missing while still in flight
 * @param {number} [parts.status]
 * @param {number} [parts.durationMs]
 * @param {number | null} [parts.count]
 * @returns {string} e.g. "loaded your chats (4) · ok 200 · 31 ms"
 */
export function requestLine({ phrase, outcome, status, durationMs, count }) {
  const head = count === null || count === undefined ? phrase : `${phrase} (${count})`;
  if (!outcome) return `${head} · sending`;
  const result = status ? `${outcome} ${status}` : outcome;
  return durationMs === undefined
    ? `${head} · ${result}`
    : `${head} · ${result} · ${durationMs} ms`;
}

const POLL_KINDS = {
  '/conversation': 'chats',
  '/message': 'messages',
  '/user': 'people',
  '/debug/logs': 'server logs',
};

/**
 * @param {string} path
 * @returns {string} which background check a poll belongs to
 */
export function pollKind(path) {
  return POLL_KINDS[path] ?? 'other';
}

const ANSI = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  cyan: '\u001b[36m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
};
const LEVEL_COLOUR = { info: '', warn: ANSI.yellow, error: ANSI.red };
const CATEGORY_WIDTH = 7;
const DETAIL_GAP = '   ';

/**
 * One terminal line: time, category, the plain sentence, then the detail.
 * @param {{ time: number, level: string, category: string, message: string, detail?: string }} entry
 * @param {{ color?: boolean }} [options] ANSI colour (Metro's terminal shows it)
 * @returns {string}
 */
export function formatConsoleLine(entry, { color = true } = {}) {
  const paint = (code, text) => (color && code ? `${code}${text}${ANSI.reset}` : text);
  const time = paint(ANSI.dim, formatLogTime(entry.time));
  const category = paint(ANSI.cyan, entry.category.padEnd(CATEGORY_WIDTH));
  const message = paint(LEVEL_COLOUR[entry.level], entry.message);
  const detail = entry.detail ? `${DETAIL_GAP}${paint(ANSI.dim, entry.detail)}` : '';
  return `${time}  ${category}${message}${detail}`;
}

/**
 * describeRequest for a recorded networkStore row: uses the row's own body
 * and whether it carried a login, so the server test reads "tested the server"
 * and a new group reads "created the group ...".
 * @param {object} row
 */
export function describeRow(row) {
  return describeRequest({
    method: row.method,
    path: row.path,
    query: row.query,
    body: row.requestBody,
    isPoll: row.isPoll,
    auth: !row.requestHeaders || Boolean(row.requestHeaders.Authorization),
  });
}
