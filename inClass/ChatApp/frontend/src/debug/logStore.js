/**
 * logStore: the app-side log lines shown in the Inspector's Logs tab.
 * Holds the newest MAX_LOG_ENTRIES entries. Written only through logger.js
 * and api/client.js.
 *
 * Entry shape:
 * { id, time, source: 'app', level: 'info'|'warn'|'error',
 *   category: 'API'|'POLL'|'NAV'|'STATE'|'APP', message, detail?, requestId?,
 *   isPoll?, pending? }
 *
 * A request is ONE entry, updated in place when its reply arrives (V4).
 * Successful background checks are not lines at all: they only bump the
 * heartbeat counters, shown as one live row at the top of the Logs tab.
 */
import { MAX_LOG_ENTRIES } from '../constants/config';
import { createStore } from '../store/createStore';
import { appendCapped } from '../utils/list';

const EMPTY_HEARTBEAT = { checks: 0, failures: 0, lastAt: 0, byKind: {} };

export const logStore = createStore({ entries: [], heartbeat: EMPTY_HEARTBEAT });

let nextId = 1;

/**
 * @param {Omit<object, 'id' | 'time' | 'source'>} entry
 * @returns {object} the stored entry
 */
export function addLogEntry(entry) {
  const stored = { ...entry, id: String(nextId), time: Date.now(), source: 'app' };
  nextId += 1;
  logStore.set((state) => ({ entries: appendCapped(state.entries, stored, MAX_LOG_ENTRIES) }));
  return stored;
}

/**
 * Replaces fields of one entry (a request that just got its reply).
 * Does nothing if the entry has already scrolled out of the buffer.
 * @param {string} id
 * @param {object} patch
 */
export function updateLogEntry(id, patch) {
  logStore.set((state) => ({
    entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  }));
}

/**
 * Counts one background check.
 * @param {string} kind "chats", "messages", ... (see pollKind)
 * @param {boolean} isOk
 * @param {number} [now]
 */
export function recordHeartbeat(kind, isOk, now = Date.now()) {
  logStore.set((state) => {
    const { heartbeat } = state;
    return {
      heartbeat: {
        checks: heartbeat.checks + 1,
        failures: heartbeat.failures + (isOk ? 0 : 1),
        lastAt: now,
        byKind: { ...heartbeat.byKind, [kind]: (heartbeat.byKind[kind] ?? 0) + 1 },
      },
    };
  });
}

export function clearLogs() {
  logStore.set({ entries: [], heartbeat: EMPTY_HEARTBEAT });
}
