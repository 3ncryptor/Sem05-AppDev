/**
 * logger: the only place that writes to the console. Every line goes to the
 * Metro terminal AND to logStore, so the in-app Inspector shows the same
 * thing (buildPlan.md 9). Never pass passwords or the Authorization header;
 * request bodies go through safeForLog first (see api/client.js).
 *
 * Usage: log.api('-> GET /user #a1f3'); log.state('session: signed in');
 */
import { addLogEntry } from '../debug/logStore';

const CONSOLE_BY_LEVEL = {
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

/**
 * @param {object} entry
 * @param {'info' | 'warn' | 'error'} entry.level
 * @param {'API' | 'POLL' | 'NAV' | 'STATE' | 'APP'} entry.category
 * @param {string} entry.message
 * @param {string} [entry.requestId]
 * @param {boolean} [entry.isPoll]
 * @param {boolean} [entry.toConsole=true] false keeps it in the Inspector only
 */
export function writeLog({ toConsole = true, ...entry }) {
  addLogEntry(entry);
  if (!toConsole) return;
  const tag = `[${entry.category}]`.padEnd(8);
  CONSOLE_BY_LEVEL[entry.level](`${tag}${entry.message}`);
}

function make(category, defaultLevel = 'info') {
  return (message, extra = {}) => writeLog({ level: defaultLevel, category, message, ...extra });
}

export const log = {
  api: make('API'),
  poll: make('POLL'),
  nav: make('NAV'),
  state: make('STATE'),
  app: make('APP'),
  warn: make('APP', 'warn'),
  error: make('APP', 'error'),
};
