/**
 * Pure text formatting for the Inspector: one log line, and the "copy debug
 * report" text (versions, server, last lines). Never includes the password;
 * log lines are already redacted by logger.js and the backend.
 */
import { formatLogTime } from '../utils/format';

/**
 * @param {{ time: number, source: string, category: string, message: string,
 *   detail?: string, requestId?: string }} entry
 */
export function formatLogLine(entry) {
  const id = entry.detail ? `   ${entry.detail}` : entry.requestId ? ` #${entry.requestId}` : '';
  const source = entry.source === 'server' ? 'SRV' : 'APP';
  return `${formatLogTime(entry.time)} ${source} ${entry.category.toLowerCase()} ${entry.message}${id}`;
}

/**
 * @param {object} input
 * @param {object[]} input.entries oldest first
 * @param {number} input.lines how many of the newest entries to include
 * @param {{ app: string, sdk: string, platform: string }} input.versions
 * @param {{ baseUrl: string, name: string }} input.session
 * @param {string} input.serverLogs status of /debug/logs
 * @param {number} [input.now]
 * @returns {string}
 */
export function buildDebugReport({
  entries,
  lines,
  versions,
  session,
  serverLogs,
  now = Date.now(),
}) {
  const recent = entries.slice(-lines);
  return [
    'huddle. debug report',
    `time: ${new Date(now).toISOString()}`,
    `app: ${versions.app}  sdk: ${versions.sdk}  platform: ${versions.platform}`,
    `server: ${session.baseUrl || 'none'}  user: ${session.name || 'signed out'}`,
    `server logs: ${serverLogs}`,
    `last ${recent.length} lines:`,
    ...recent.map(formatLogLine),
  ].join('\n');
}
