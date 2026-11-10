/**
 * client: the one place that talks HTTP. Every request
 * - adds the raw Basic auth header, X-Request-Id, and X-Client-Poll for polls
 * - times out after REQUEST_TIMEOUT_MS
 * - is recorded in networkStore and logged (body made safe, never the password)
 * - fails at once with a network error while Inspector > tools > simulate offline is on
 * - resolves with parsed JSON, or throws an ApiError
 *
 * Screens never call fetch; they use the endpoint modules next to this file.
 */
import { LOG_POLLS_TO_CONSOLE, MAX_PREVIEW_CHARS, REQUEST_TIMEOUT_MS } from '../constants/config';
import { finishRequest, startRequest } from '../debug/networkStore';
import { toolsStore } from '../debug/toolsStore';
import { sessionStore } from '../store/sessionStore';
import { clipText, previewBody } from '../utils/logBody';
import { log } from '../utils/logger';
import { createRequestId } from '../utils/requestId';
import { joinUrl } from '../utils/serverUrl';
import { ApiError, messageFromBody } from './ApiError';
import { buildAuthHeader } from './authHeader';

/**
 * @typedef {object} Connection
 * @property {string} baseUrl e.g. "http://192.168.1.5:3000"
 * @property {string} [name]
 * @property {string} [password]
 */

/**
 * Turns { a: 1, b: undefined } into "?a=1". Empty values are skipped.
 * @param {Record<string, string | number | undefined | null>} [query]
 */
export function buildQuery(query) {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function currentConnection() {
  const { baseUrl, name, password } = sessionStore.get();
  return { baseUrl, name, password };
}

function buildHeaders({ id, connection, auth, isPoll, hasBody }) {
  const headers = { Accept: 'application/json', 'X-Request-Id': id };
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (isPoll) headers['X-Client-Poll'] = '1';
  if (auth && connection.name) {
    headers.Authorization = buildAuthHeader(connection.name, connection.password ?? '');
  }
  return headers;
}

/** @returns {Promise<{ data: unknown, bytes: number }>} bytes is the body length in characters */
async function readJson(response) {
  const text = await response.text();
  if (!text) return { data: null, bytes: 0 };
  try {
    return { data: JSON.parse(text), bytes: text.length };
  } catch {
    return { data: text, bytes: text.length };
  }
}

/**
 * @param {string} path e.g. "/conversation"
 * @param {object} [options]
 * @param {'GET' | 'POST'} [options.method='GET']
 * @param {Record<string, any>} [options.query]
 * @param {unknown} [options.body] sent as JSON
 * @param {boolean} [options.isPoll=false] tags the request as a background poll
 * @param {boolean} [options.auth=true] false sends no Authorization header
 * @param {Connection} [options.connection] defaults to the signed-in session
 * @returns {Promise<any>}
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    isPoll = false,
    auth = true,
    connection = currentConnection(),
  } = options;
  const id = createRequestId();
  const label = `${method} ${path}`;
  const toConsole = LOG_POLLS_TO_CONSOLE || !isPoll;
  const tags = { requestId: id, isPoll };

  if (!connection.baseUrl) {
    throw new ApiError({ kind: 'network', message: 'No server selected.', requestId: id });
  }

  const requestPreview = previewBody(body);
  startRequest({ id, method, path, isPoll, requestPreview });
  log.api(`-> ${label} #${id} ${requestPreview}`.trimEnd(), { ...tags, toConsole });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  function fail(error) {
    const durationMs = Date.now() - startedAt;
    finishRequest(id, { state: 'error', status: error.status, durationMs, error: error.message });
    log.api(`<- ${error.status || error.kind} ${label} #${id} ${durationMs}ms "${error.message}"`, {
      ...tags,
      level: 'error',
      // a failed request is an expected outcome, not a code bug: no red error screen
      consoleLevel: 'warn',
    });
    return error;
  }

  if (toolsStore.get().simulateOffline) {
    clearTimeout(timer);
    throw fail(new ApiError({ kind: 'network', message: 'Simulated offline', requestId: id }));
  }

  let response;
  try {
    response = await fetch(joinUrl(connection.baseUrl, path) + buildQuery(query), {
      method,
      headers: buildHeaders({ id, connection, auth, isPoll, hasBody: body !== undefined }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    const kind = controller.signal.aborted ? 'timeout' : 'network';
    const message = kind === 'timeout' ? 'Request timed out' : String(cause?.message ?? cause);
    throw fail(new ApiError({ kind, message, requestId: id }));
  } finally {
    clearTimeout(timer);
  }

  const { data, bytes } = await readJson(response);
  if (!response.ok) {
    const message = messageFromBody(data, response.status);
    throw fail(new ApiError({ kind: 'http', status: response.status, message, requestId: id }));
  }

  const durationMs = Date.now() - startedAt;
  const responsePreview = clipText(previewBody(data), MAX_PREVIEW_CHARS);
  finishRequest(id, { state: 'ok', status: response.status, durationMs, bytes, responsePreview });
  log.api(`<- ${response.status} ${label} #${id} ${durationMs}ms`, { ...tags, toConsole });
  return data;
}
