/**
 * inspectorStore: the Inspector panel's state (buildPlan.md 15).
 *   isOpen       the panel is open (it grows out of the header notch)
 *   tab          overview | flow | network | logs | tools
 *   requestId    the request open in network's detail view (devtools style)
 *   replayId     the request the flow tab replays step by step
 *   seenLogId    newest app log id the user has seen (the orb's error badge)
 */
import { log } from '../utils/logger';
import { createStore } from '../store/createStore';
import { logStore } from './logStore';

export const INSPECTOR_TABS = ['overview', 'flow', 'network', 'logs', 'tools'];

export const inspectorStore = createStore({
  isOpen: false,
  tab: 'overview',
  requestId: null,
  replayId: null,
  seenLogId: 0,
});

function newestLogId() {
  const { entries } = logStore.get();
  return entries.length ? Number(entries[entries.length - 1].id) : 0;
}

/** @param {'orb' | 'shake' | 'profile' | 'island'} via */
export function openInspector(via) {
  if (inspectorStore.get().isOpen) return;
  log.nav(`inspector opened (${via})`);
  inspectorStore.set({ isOpen: true, seenLogId: newestLogId() });
}

export function closeInspector() {
  if (!inspectorStore.get().isOpen) return;
  inspectorStore.set({ isOpen: false, seenLogId: newestLogId() });
  log.nav('inspector closed');
}

/** @param {string} tab */
export function setInspectorTab(tab) {
  if (INSPECTOR_TABS.includes(tab)) inspectorStore.set({ tab });
}

/**
 * Opens one request in the network tab's detail view.
 * @param {string} id request id
 */
export function openRequest(id) {
  inspectorStore.set({ tab: 'network', requestId: id });
}

export function closeRequest() {
  inspectorStore.set({ requestId: null });
}

/**
 * Plays one request step by step in the flow tab (null = pick one there).
 * @param {string | null} id
 */
export function replayInFlow(id) {
  inspectorStore.set({ tab: 'flow', replayId: id });
}

export function stopReplay() {
  inspectorStore.set({ replayId: null });
}
