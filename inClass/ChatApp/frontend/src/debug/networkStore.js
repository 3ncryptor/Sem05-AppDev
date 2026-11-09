/**
 * networkStore: one row per HTTP request for the Inspector's Network tab and
 * the Live Wire view. Rows start as "pending" and are finished with the
 * status and duration. Keyed by the request id sent in X-Request-Id.
 *
 * Row shape:
 * { id, method, path, isPoll, startedAt, state: 'pending'|'ok'|'error',
 *   requestPreview, status?, durationMs?, bytes?, responsePreview?, error? }
 * Previews are already made safe by logBody.js (no passwords, short base64).
 */
import { MAX_NETWORK_ENTRIES } from '../constants/config';
import { createStore } from '../store/createStore';
import { appendCapped, updateById } from '../utils/list';

export const networkStore = createStore({ requests: [] });

/**
 * @param {{ id: string, method: string, path: string, isPoll: boolean,
 *   requestPreview?: string }} request
 */
export function startRequest({ id, method, path, isPoll, requestPreview = '' }) {
  const row = { id, method, path, isPoll, requestPreview, startedAt: Date.now(), state: 'pending' };
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
  networkStore.set((state) => ({ requests: updateById(state.requests, id, result) }));
}

export function clearRequests() {
  networkStore.set({ requests: [] });
}
