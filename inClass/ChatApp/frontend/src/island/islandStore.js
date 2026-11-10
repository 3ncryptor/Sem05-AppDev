/**
 * islandStore: what the notch island is showing (V7).
 *
 * state:
 *   activities   live things (see islandQueue for the shape)
 *   primaryKey   the activity the user switched into the main pill
 *   expandedKey  the activity open as a card
 *   confirm      a short confirmation ("photo sent") that briefly takes over
 *   glance       the status card opened from the resting island (W1)
 *   breathId     bumps for the one-time "still here" breath at rest (W1)
 *   arrivalId    bumps when a message arrives, for the arrival ring (W2)
 *
 * Any module can call these functions; NotchIsland only reads the state.
 * Timers live here, so the rules (how long things stay) are testable.
 */
import { sessionStore } from '../store/sessionStore';
import { createStore } from '../store/createStore';
import { log } from '../utils/logger';
import {
  cycleKey,
  expireActivities,
  nextExpiry,
  removeActivity,
  upsertActivity,
  visibleActivities,
} from './islandQueue';

/** How long a new message stays open as a card before settling back. */
export const AUTO_EXPAND_MS = 4000;
/** Default hold for a confirmation. */
export const CONFIRM_MS = 1600;
/** The glance card closes by itself after this long. */
export const GLANCE_MS = 6000;

const initialState = {
  activities: [],
  primaryKey: null,
  expandedKey: null,
  confirm: null,
  glance: false,
  breathId: 0,
  arrivalId: 0,
};

export const islandStore = createStore(initialState);

let expiryTimer = null;
let autoCollapseTimer = null;
let confirmTimer = null;
let glanceTimer = null;
let canAutoExpand = () => true;

/**
 * NotchIsland supplies the rule for when a card may open by itself (not while
 * the keyboard is up or the Inspector is open).
 * @param {() => boolean} guard
 */
export function setAutoExpandGuard(guard) {
  canAutoExpand = guard;
}

function scheduleExpiry() {
  clearTimeout(expiryTimer);
  const at = nextExpiry(islandStore.get().activities);
  if (at === null) return;
  expiryTimer = setTimeout(
    () => {
      const { activities, primaryKey, expandedKey } = islandStore.get();
      const live = expireActivities(activities, Date.now());
      const keys = new Set(live.map((item) => item.key));
      islandStore.set({
        activities: live,
        primaryKey: keys.has(primaryKey) ? primaryKey : null,
        expandedKey: keys.has(expandedKey) ? expandedKey : null,
      });
      scheduleExpiry();
    },
    Math.max(0, at - Date.now()),
  );
}

/**
 * Adds or updates an activity (same key = update in place).
 * @param {object} activity { key, kind, title, ... , autoExpand? }
 * @param {{ ttlMs?: number }} [options] removes it after ttlMs
 */
export function showActivity(activity, { ttlMs } = {}) {
  const now = Date.now();
  const next = ttlMs ? { ...activity, expiresAt: now + ttlMs } : activity;
  const previous = islandStore.get().activities.find((item) => item.key === activity.key);
  const isArrival =
    activity.kind === 'message' && (!previous || (activity.count ?? 0) > (previous.count ?? 0));
  if (islandStore.get().glance) closeGlance();
  islandStore.set((state) => ({
    activities: upsertActivity(state.activities, next, now),
    arrivalId: isArrival ? state.arrivalId + 1 : state.arrivalId,
  }));
  scheduleExpiry();

  // Never take over a card the user has open (or is typing a reply in).
  if (activity.autoExpand && !islandStore.get().expandedKey && canAutoExpand()) {
    // a new arrival takes the main pill for its moment
    islandStore.set({ primaryKey: activity.key, expandedKey: activity.key });
    clearTimeout(autoCollapseTimer);
    autoCollapseTimer = setTimeout(() => {
      if (islandStore.get().expandedKey === activity.key) islandStore.set({ expandedKey: null });
    }, AUTO_EXPAND_MS);
  }
}

/** @param {string} key */
export function dismissActivity(key) {
  islandStore.set((state) => ({
    activities: removeActivity(state.activities, key),
    primaryKey: state.primaryKey === key ? null : state.primaryKey,
    expandedKey: state.expandedKey === key ? null : state.expandedKey,
  }));
  scheduleExpiry();
}

/** Opens an activity as a card; stays open until collapsed. */
export function expandIsland(key) {
  clearTimeout(autoCollapseTimer);
  islandStore.set({ primaryKey: key, expandedKey: key });
  log.state(`island: opened ${key}`);
}

export function collapseIsland() {
  clearTimeout(autoCollapseTimer);
  islandStore.set({ expandedKey: null });
}

/** Swipe on the pill: the next live activity takes the main spot. */
export function cycleIsland(direction) {
  const { activities, primaryKey } = islandStore.get();
  const current = primaryKey ?? visibleActivities(activities, null).main?.key ?? null;
  islandStore.set({ primaryKey: cycleKey(activities, current, direction), expandedKey: null });
}

/** Tap on a circle: that activity moves into the main pill. */
export function promoteActivity(key) {
  islandStore.set({ primaryKey: key, expandedKey: null });
}

/**
 * The square confirmation morph ("signed in", "photo sent", "group created").
 * @param {{ title: string, detail?: string, name?: string, tone?: 'success' | 'danger' }} confirm
 * @param {number} [holdMs]
 */
export function confirmIsland(confirm, holdMs = CONFIRM_MS) {
  clearTimeout(confirmTimer);
  islandStore.set({ confirm: { tone: 'success', ...confirm, id: Date.now() } });
  confirmTimer = setTimeout(() => islandStore.set({ confirm: null }), holdMs);
}

/** Tap on a confirmation: it gives way at once. */
export function clearConfirm() {
  clearTimeout(confirmTimer);
  islandStore.set({ confirm: null });
}

/** The status card from the resting island; closes by itself after GLANCE_MS. */
export function openGlance() {
  clearTimeout(glanceTimer);
  islandStore.set({ glance: true });
  glanceTimer = setTimeout(closeGlance, GLANCE_MS);
}

/** Keeps the glance open while the user is touching it. */
export function holdGlance() {
  clearTimeout(glanceTimer);
  glanceTimer = setTimeout(closeGlance, GLANCE_MS);
}

export function closeGlance() {
  clearTimeout(glanceTimer);
  islandStore.set({ glance: false });
}

/** One quiet "still here" breath; only when nothing is live or open. */
export function breatheIsland() {
  const { activities, glance, confirm } = islandStore.get();
  if (activities.length || glance || confirm) return;
  islandStore.set((state) => ({ breathId: state.breathId + 1 }));
}

/** Clears everything (sign out, tests). */
export function resetIsland() {
  clearTimeout(expiryTimer);
  clearTimeout(autoCollapseTimer);
  clearTimeout(confirmTimer);
  clearTimeout(glanceTimer);
  islandStore.reset();
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut' && islandStore.get().activities.length) resetIsland();
});
