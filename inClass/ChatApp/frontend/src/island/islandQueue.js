/**
 * islandQueue: the pure rules behind the notch island (buildPlan.md 13, V7).
 *
 * An activity is something live the island can show:
 *   { key, kind, title, detail?, chatId?, names?, count?, tone?,
 *     expiresAt?, autoExpand?, createdAt, updatedAt }
 *
 * Like the iPhone 18 Pro's island, up to three are live at once: one in the
 * main pill, two as circles beside it. The rest wait by priority. The same
 * key always updates in place, so nothing ever shows twice.
 */

/** Lower comes first. */
export const PRIORITY = {
  failed: 0,
  connection: 1,
  message: 2,
  upload: 3,
  newChat: 4,
  copied: 5,
};

const MAX_CIRCLES = 2;
const FALLBACK_PRIORITY = 9;

/**
 * @param {object[]} list
 * @param {object} activity must have key and kind
 * @param {number} [now]
 * @returns {object[]} a new list
 */
export function upsertActivity(list, activity, now = Date.now()) {
  const existing = list.find((item) => item.key === activity.key);
  if (!existing) return [...list, { ...activity, createdAt: now, updatedAt: now }];
  return list.map((item) =>
    item.key === activity.key
      ? { ...item, ...activity, createdAt: item.createdAt, updatedAt: now }
      : item,
  );
}

/** @returns {object[]} a new list without that key */
export function removeActivity(list, key) {
  return list.filter((item) => item.key !== key);
}

/** @returns {object[]} a new list without the activities whose time is up */
export function expireActivities(list, now = Date.now()) {
  return list.filter((item) => !item.expiresAt || item.expiresAt > now);
}

/** @returns {number | null} the soonest expiry, for the store's timer */
export function nextExpiry(list) {
  const times = list.map((item) => item.expiresAt).filter(Boolean);
  return times.length ? Math.min(...times) : null;
}

/** Priority first, then the most recently updated. Returns a new array. */
export function orderActivities(list) {
  const rank = (item) => PRIORITY[item.kind] ?? FALLBACK_PRIORITY;
  return [...list].sort((a, b) => rank(a) - rank(b) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/**
 * What the island shows right now.
 * @param {object[]} list
 * @param {string | null} primaryKey the activity the user switched to, if still live
 * @returns {{ main: object | null, circles: object[], waiting: number }}
 */
export function visibleActivities(list, primaryKey) {
  const ordered = orderActivities(list);
  const pinned = ordered.find((item) => item.key === primaryKey);
  const main = pinned ?? ordered[0] ?? null;
  if (!main) return { main: null, circles: [], waiting: 0 };
  const others = ordered.filter((item) => item.key !== main.key);
  return {
    main,
    circles: others.slice(0, MAX_CIRCLES),
    waiting: Math.max(0, others.length - MAX_CIRCLES),
  };
}

/**
 * The next activity to put in the main pill when the user swipes.
 * Cycles through the visible ones only, in display order.
 * @param {object[]} list
 * @param {string | null} currentKey
 * @param {1 | -1} direction
 * @returns {string | null}
 */
export function cycleKey(list, currentKey, direction) {
  const keys = orderActivities(list)
    .slice(0, MAX_CIRCLES + 1)
    .map((item) => item.key);
  if (!keys.length) return null;
  const index = Math.max(0, keys.indexOf(currentKey));
  return keys[(index + direction + keys.length) % keys.length];
}
