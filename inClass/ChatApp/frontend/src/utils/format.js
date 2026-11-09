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

/**
 * Clock time in the app's lowercase style, e.g. "7:55 pm". Formatted by
 * hand because Hermes' Intl support differs between iOS and Android.
 * @param {string | number | Date} value
 * @returns {string} '' for an invalid date
 */
export function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'am' : 'pm';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/**
 * Full timestamp for message details, e.g. "12 Mar 2026, 7:55 pm".
 * @param {string | number | Date} value
 */
export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${formatClock(date)}`;
}
