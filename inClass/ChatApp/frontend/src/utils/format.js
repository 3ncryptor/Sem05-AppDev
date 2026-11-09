/**
 * Small text-formatting helpers shared by components. Pure functions, so
 * they are covered by unit tests.
 */

const MAX_BADGE_COUNT = 9;

/**
 * Text for a count badge: nothing for zero, "9+" above nine.
 * @param {number} count
 * @returns {string}
 */
export function formatBadgeCount(count) {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(Math.floor(count));
}
