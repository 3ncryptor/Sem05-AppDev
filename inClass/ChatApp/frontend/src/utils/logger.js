/**
 * logger: the only place that writes to the console. Every line goes to the
 * Metro terminal AND to logStore, so the in-app Inspector shows the same
 * thing (buildPlan.md 9). Never pass passwords or the Authorization header;
 * request bodies go through safeForLog first (see api/client.js).
 *
 * Terminal lines are aligned columns with ANSI colour (V4):
 *   09:05:07  API    sent a message · ok 201 · 84 ms   POST /message #ab12
 *
 * Usage: log.state('session: signed in'); log.nav('tab bar -> people');
 */
import { formatConsoleLine } from '../debug/describeRequest';
import { addLogEntry } from '../debug/logStore';

const CONSOLE_BY_LEVEL = {
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

/**
 * Prints an entry to the terminal (used directly when an entry was updated in place).
 * @param {object} entry a stored log entry
 * @param {'info' | 'warn' | 'error'} [consoleLevel]
 */
export function printLog(entry, consoleLevel) {
  CONSOLE_BY_LEVEL[consoleLevel ?? entry.level](formatConsoleLine(entry));
}

/**
 * @param {object} entry
 * @param {'info' | 'warn' | 'error'} entry.level
 * @param {'API' | 'POLL' | 'NAV' | 'STATE' | 'APP'} entry.category
 * @param {string} entry.message the plain sentence
 * @param {string} [entry.detail] technical detail: method, path, request id
 * @param {string} [entry.requestId]
 * @param {boolean} [entry.isPoll]
 * @param {boolean} [entry.toConsole=true] false keeps it in the Inspector only
 * @param {'info' | 'warn' | 'error'} [entry.consoleLevel] console channel when it should
 *   differ from the level. Expected failures (server down, wrong password) use 'warn':
 *   console.error opens React Native's red error screen, which is meant for code bugs.
 * @returns {object} the stored entry
 */
export function writeLog({ toConsole = true, consoleLevel, ...entry }) {
  const stored = addLogEntry(entry);
  if (toConsole) printLog(stored, consoleLevel);
  return stored;
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
