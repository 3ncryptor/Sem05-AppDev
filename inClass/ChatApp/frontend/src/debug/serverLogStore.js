/**
 * serverLogStore: lines from the backend's local-only GET /debug/logs.
 * status: 'idle' | 'checking' | 'available' | 'unsupported' | 'unreachable' | 'signedOut'
 *
 * checkServerLogs() runs when the Inspector opens, on "check again", and
 * after a server change; pollServerLogs() runs every 2 s only while the
 * Inspector is open and the status is 'available'. Any failure ends in a
 * calm state; nothing here throws.
 */
import { fetchServerLogs } from '../api/debugLogs';
import { MAX_SERVER_LOG_ENTRIES, SERVER_LOG_BACKLOG, SERVER_LOG_PAGE } from '../constants/config';
import { createStore } from '../store/createStore';
import { sessionStore } from '../store/sessionStore';
import { log } from '../utils/logger';
import { isLogPage, normalizeServerEntry, startSeq, stateFromError } from './serverLogsState';

const EMPTY = { status: 'idle', entries: [], afterSeq: 0 };

export const serverLogStore = createStore(EMPTY);

function setStatus(status) {
  if (serverLogStore.get().status !== status) log.state(`server logs: ${status}`);
  serverLogStore.set({ status });
}

function addPage(page) {
  const fresh = page.entries.map(normalizeServerEntry);
  const lastSeq = fresh.length ? fresh[fresh.length - 1].seq : serverLogStore.get().afterSeq;
  serverLogStore.set((state) => ({
    entries: [...state.entries, ...fresh].slice(-MAX_SERVER_LOG_ENTRIES),
    // the buffer may have been restarted (latestSeq went down): start over
    afterSeq: page.latestSeq < state.afterSeq ? page.latestSeq : lastSeq,
  }));
}

function handleFailure(error) {
  setStatus(stateFromError(error));
}

/** Asks the server whether it shares logs, then loads the recent backlog. */
export async function checkServerLogs() {
  if (sessionStore.get().status !== 'signedIn') {
    serverLogStore.set({ ...EMPTY });
    setStatus('signedOut');
    return;
  }
  serverLogStore.set({ ...EMPTY, status: 'checking' });
  try {
    const probe = await fetchServerLogs({ after: 0, limit: 1 });
    if (!isLogPage(probe)) {
      setStatus('unsupported');
      return;
    }
    serverLogStore.set({ afterSeq: startSeq(probe.latestSeq, SERVER_LOG_BACKLOG) });
    setStatus('available');
    await pollServerLogs();
  } catch (error) {
    handleFailure(error);
  }
}

/** Fetches lines newer than the last one seen. */
export async function pollServerLogs() {
  if (serverLogStore.get().status !== 'available') return;
  try {
    const page = await fetchServerLogs({
      after: serverLogStore.get().afterSeq,
      limit: SERVER_LOG_PAGE,
    });
    if (!isLogPage(page)) {
      setStatus('unsupported');
      return;
    }
    addPage(page);
  } catch (error) {
    handleFailure(error);
  }
}

export function clearServerLogs() {
  serverLogStore.set({ entries: [] });
}

// A new server or a new user means the old lines no longer apply.
let lastKey = '';
sessionStore.subscribe((session) => {
  const key = `${session.status}|${session.baseUrl}|${session.name}`;
  if (key === lastKey) return;
  lastKey = key;
  serverLogStore.set({ ...EMPTY });
});
