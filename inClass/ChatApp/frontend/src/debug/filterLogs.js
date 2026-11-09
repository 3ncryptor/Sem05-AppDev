/**
 * Pure helpers for the Inspector's Logs tab: merge app and server lines in
 * time order and apply the filter chips, toggles and search box.
 */

export const LOG_LEVELS = ['info', 'warn', 'error'];

export const DEFAULT_LOG_FILTERS = {
  sources: ['app', 'server'],
  levels: LOG_LEVELS,
  /** Empty means every category. */
  categories: [],
  hidePolls: true,
  hideBot: false,
  search: '',
};

/** Matches the backend's BotService context and FactBot lines. */
const BOT_PATTERN = /bot/i;

/**
 * @param {object[]} appEntries oldest first
 * @param {object[]} serverEntries oldest first
 * @returns {object[]} one list, oldest first (stable for equal times)
 */
export function mergeLogs(appEntries, serverEntries) {
  return [...appEntries, ...serverEntries]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.time - b.entry.time || a.index - b.index)
    .map(({ entry }) => entry);
}

/**
 * @param {object} entry
 * @param {typeof DEFAULT_LOG_FILTERS} filters
 */
function matches(entry, filters) {
  if (!filters.sources.includes(entry.source)) return false;
  if (!filters.levels.includes(entry.level)) return false;
  if (filters.categories.length && !filters.categories.includes(entry.category)) return false;
  if (filters.hidePolls && entry.isPoll) return false;
  if (filters.hideBot && (BOT_PATTERN.test(entry.category) || BOT_PATTERN.test(entry.message)))
    return false;
  const search = filters.search.trim().toLowerCase();
  if (!search) return true;
  return [entry.message, entry.category, entry.requestId ?? '']
    .join(' ')
    .toLowerCase()
    .includes(search);
}

/**
 * @param {object[]} entries
 * @param {typeof DEFAULT_LOG_FILTERS} filters
 * @returns {object[]} a new list
 */
export function filterLogs(entries, filters) {
  return entries.filter((entry) => matches(entry, filters));
}

/**
 * Categories present in the entries, in first-seen order, for the chips.
 * @param {object[]} entries
 * @returns {string[]}
 */
export function logCategories(entries) {
  return [...new Set(entries.map((entry) => entry.category))];
}

/**
 * Adds the value if missing, removes it if present.
 * @param {string[]} list
 * @param {string} value
 * @returns {string[]} a new list
 */
export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Number of error lines newer than the last one the user has seen.
 * @param {object[]} entries app entries with numeric-string ids
 * @param {number} seenId
 */
export function unseenErrorCount(entries, seenId) {
  return entries.filter((entry) => entry.level === 'error' && Number(entry.id) > seenId).length;
}
