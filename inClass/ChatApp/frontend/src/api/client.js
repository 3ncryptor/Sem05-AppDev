/**
 * client: the one place that talks HTTP. Every request
 * - adds the raw Basic auth header, X-Request-Id, and X-Client-Poll for polls
 * - times out after REQUEST_TIMEOUT_MS
 * - is recorded in networkStore and logged as ONE plain-language line that is
 *   updated when the reply arrives (body made safe, never the password). A
 *   successful background poll only bumps the heartbeat; a failed one is logged.
 * - fails at once with a network error while Inspector > tools > simulate offline is on
 * - resolves with parsed JSON, or throws an ApiError
 *
 * Screens never call fetch; they use the endpoint modules next to this file.
 */
import { LOG_POLLS_TO_CONSOLE, MAX_PREVIEW_CHARS, REQUEST_TIMEOUT_MS } from '../constants/config';
import {
  describeOutcome,
  describeRequest,
  pollKind,
  requestLine,
  resultCount,
} from '../debug/describeRequest';
import { recordHeartbeat, updateLogEntry } from '../debug/logStore';
import { finishRequest, startRequest } from '../debug/networkStore';
import { toolsStore } from '../debug/toolsStore';
import { sessionStore } from '../store/sessionStore';
import { clipText, previewBody, safeForInspector } from '../utils/logBody';
import { redactHeaders } from '../debug/networkDetail';
import { log, printLog } from '../utils/logger';
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

/** Response headers as a plain object (fetch's Headers is not serialisable). */
function readHeaders(response) {
  const headers = {};
  response.headers?.forEach?.((value, key) => {
    headers[key] = key === 'set-cookie' ? '<hidden>' : value;
  });
  return headers;
}

function networkError(cause, controller, requestId) {
  const kind = controller.signal.aborted ? 'timeout' : 'network';
  const message = kind === 'timeout' ? 'Request timed out' : String(cause?.message ?? cause);
  return new ApiError({ kind, message, requestId });
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
 * @param {string} [options.initiator] who started it, for the Inspector (e.g. "inbox checker")
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
    initiator,
  } = options;
  const id = createRequestId();
  const phrase = describeRequest({ method, path, query, body, isPoll, auth });
  const detail = `${method} ${path} #${id}`;
  const tags = { requestId: id, isPoll, detail };

  if (!connection.baseUrl) {
    throw new ApiError({ kind: 'network', message: 'No server selected.', requestId: id });
  }

  const requestPreview = previewBody(body);
  const url = joinUrl(connection.baseUrl, path) + buildQuery(query);
  const headers = buildHeaders({ id, connection, auth, isPoll, hasBody: body !== undefined });
  startRequest({
    id,
    method,
    path,
    url,
    query,
    isPoll,
    initiator,
    requestPreview,
    requestHeaders: redactHeaders(headers, connection.name),
    requestBody: body === undefined ? undefined : safeForInspector(body),
  });
  // In flight: shown as "sending" in the Inspector, printed once it finishes.
  const pending = isPoll
    ? null
    : log.api(requestLine({ phrase }), { ...tags, pending: true, toConsole: false });

  /** Rewrites the pending line (or adds one for a poll) and prints it once. */
  function settle({ level, outcome, status, durationMs, count, consoleLevel }) {
    const message = requestLine({ phrase, outcome, status, durationMs, count });
    if (!pending) {
      log.api(message, { ...tags, level, consoleLevel, toConsole: true });
      return;
    }
    const patch = { level, message, pending: false };
    updateLogEntry(pending.id, patch);
    printLog({ ...pending, ...patch }, consoleLevel);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  let ttfbMs;
  let responseHeaders;

  /** @param {object} [response] full error body; responsePreview survives pruning */
  function fail(error, response, responsePreview) {
    const durationMs = Date.now() - startedAt;
    finishRequest(id, {
      state: 'error',
      status: error.status,
      durationMs,
      ttfbMs,
      responseHeaders,
      response,
      responsePreview,
      error: error.message,
    });
    if (isPoll) recordHeartbeat(pollKind(path), false);
    settle({
      level: 'error',
      outcome: describeOutcome(error),
      status: error.status,
      durationMs,
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
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    // the server has answered (headers in); the body may still be downloading
    ttfbMs = Date.now() - startedAt;
    responseHeaders = readHeaders(response);
  } catch (cause) {
    clearTimeout(timer);
    throw fail(networkError(cause, controller, id));
  }

  // The timeout keeps running while the body downloads; a dropped or stalled
  // body fails like any other network error instead of hanging as "sending".
  let reply;
  try {
    reply = await readJson(response);
  } catch (cause) {
    throw fail(networkError(cause, controller, id));
  } finally {
    clearTimeout(timer);
  }
  const { data, bytes } = reply;
  if (!response.ok) {
    const message = messageFromBody(data, response.status);
    throw fail(
      new ApiError({ kind: 'http', status: response.status, message, requestId: id }),
      safeForInspector(data),
      clipText(previewBody(data), MAX_PREVIEW_CHARS),
    );
  }

  const durationMs = Date.now() - startedAt;
  const responsePreview = clipText(previewBody(data), MAX_PREVIEW_CHARS);
  finishRequest(id, {
    state: 'ok',
    status: response.status,
    durationMs,
    ttfbMs,
    bytes,
    responsePreview,
    responseHeaders,
    response: safeForInspector(data),
  });
  if (isPoll && !LOG_POLLS_TO_CONSOLE) {
    recordHeartbeat(pollKind(path), true);
    return data;
  }
  settle({
    level: 'info',
    outcome: 'ok',
    status: response.status,
    durationMs,
    count: resultCount(data),
  });
  return data;
}
