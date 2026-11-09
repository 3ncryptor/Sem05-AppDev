/**
 * inspectorStore: whether the Inspector sheet is open, which tab shows, and
 * the newest app log id the user has seen (the orb's error badge counts
 * errors after it). Opened from the orb, a shake, or Profile.
 */
import { log } from '../utils/logger';
import { createStore } from '../store/createStore';
import { logStore } from './logStore';

export const INSPECTOR_TABS = ['logs', 'network', 'tools'];

export const inspectorStore = createStore({ isOpen: false, tab: 'logs', seenLogId: 0 });

function newestLogId() {
  const { entries } = logStore.get();
  return entries.length ? Number(entries[entries.length - 1].id) : 0;
}

/** @param {'orb' | 'shake' | 'profile'} via */
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
