/**
 * networkStore: one row per HTTP request for the Inspector's Network tab and
 * the Live Wire view. Rows start as "pending" and are finished with the
 * status and duration. Keyed by the request id sent in X-Request-Id.
 *
 * Row shape:
 * { id, method, path, url, query, isPoll, initiator, startedAt,
 *   state: 'pending'|'ok'|'error', requestPreview, requestHeaders, requestBody,
 *   status?, durationMs?, ttfbMs?, bytes?, responsePreview?, responseHeaders?,
 *   response?, error? }
 * Everything is made safe first (logBody.js / redactHeaders: no passwords, short
 * base64). The full `response` is kept only for the newest MAX_FULL_BODIES rows;
 * older rows keep the short preview, so memory stays small.
 */
import { MAX_NETWORK_ENTRIES } from '../constants/config';
import { createStore } from '../store/createStore';
import { appendCapped, updateById } from '../utils/list';

/** Full response bodies kept for the request detail view. */
export const MAX_FULL_BODIES = 30;

/**
 * Drops `response` from all but the newest `keep` rows. Returns a new list.
 * @param {object[]} rows oldest first
 * @param {number} keep
 */
export function pruneBodies(rows, keep) {
  const cutoff = rows.length - keep;
  return rows.map((row, index) =>
    index < cutoff && row.response !== undefined ? { ...row, response: undefined } : row,
  );
}

export const networkStore = createStore({ requests: [] });

/**
 * @param {{ id: string, method: string, path: string, isPoll: boolean,
 *   requestPreview?: string, url?: string, query?: object, requestHeaders?: object,
 *   requestBody?: unknown, initiator?: string }} request
 */
export function startRequest({ requestPreview = '', ...request }) {
  const row = { ...request, requestPreview, startedAt: Date.now(), state: 'pending' };
  networkStore.set((state) => ({
    requests: appendCapped(state.requests, row, MAX_NETWORK_ENTRIES),
  }));
}

/**
 * @param {string} id
 * @param {{ state: 'ok' | 'error', status?: number, durationMs: number, bytes?: number,
 *   responsePreview?: string, error?: string }} result
 */
export function finishRequest(id, result) {
  networkStore.set((state) => ({
    requests: pruneBodies(updateById(state.requests, id, result), MAX_FULL_BODIES),
  }));
}

export function clearRequests() {
  networkStore.set({ requests: [] });
}
