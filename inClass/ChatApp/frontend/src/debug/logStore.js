/**
 * logStore: the app-side log lines shown in the Inspector's Logs tab.
 * Holds the newest MAX_LOG_ENTRIES entries. Written only through logger.js.
 *
 * Entry shape:
 * { id, time, source: 'app', level: 'info'|'warn'|'error',
 *   category: 'API'|'POLL'|'NAV'|'STATE'|'APP', message, requestId?, isPoll? }
 */
import { MAX_LOG_ENTRIES } from '../constants/config';
import { createStore } from '../store/createStore';
import { appendCapped } from '../utils/list';

export const logStore = createStore({ entries: [] });

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

export function clearLogs() {
  logStore.set({ entries: [] });
}
