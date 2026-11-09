/**
 * Pure rules for the Inspector's server logs (buildPlan.md 6.5).
 * Only the local backend has GET /debug/logs; any other server must end in a
 * calm "unsupported" state and never break the app.
 *
 *   200 with a log page  -> available
 *   404 / 401 / 403 / 405 or a 200 that is not a log page -> unsupported
 *   network error / timeout / 5xx -> unreachable (offers "check again")
 */

const UNSUPPORTED_STATUSES = [401, 403, 404, 405];

const LEVELS = {
  log: 'info',
  verbose: 'info',
  debug: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

/**
 * @param {unknown} data
 * @returns {boolean} true for { entries: [], latestSeq: number }
 */
export function isLogPage(data) {
  return (
    Boolean(data) &&
    typeof data === 'object' &&
    Array.isArray(data.entries) &&
    typeof data.latestSeq === 'number'
  );
}

/**
 * @param {{ kind?: string, status?: number }} error an ApiError
 * @returns {'unsupported' | 'unreachable'}
 */
export function stateFromError(error) {
  if (error?.kind === 'http' && UNSUPPORTED_STATUSES.includes(error.status)) return 'unsupported';
  return 'unreachable';
}

/**
 * Where to start reading so the first fetch shows only the recent backlog.
 * @param {number} latestSeq
 * @param {number} backlog
 */
export function startSeq(latestSeq, backlog) {
  return Math.max(0, latestSeq - backlog);
}

/**
 * Turns one backend entry into the same shape as an app log entry.
 * @param {{ seq: number, time: string, level: string, context: string, message: string,
 *   requestId: string | null, isPoll: boolean }} entry
 */
export function normalizeServerEntry(entry) {
  const parsed = Date.parse(entry.time);
  return {
    id: `s${entry.seq}`,
    seq: entry.seq,
    time: Number.isNaN(parsed) ? Date.now() : parsed,
    source: 'server',
    level: LEVELS[entry.level] ?? 'info',
    category: String(entry.context || 'SERVER').toUpperCase(),
    message: String(entry.message ?? ''),
    requestId: entry.requestId ?? undefined,
    isPoll: Boolean(entry.isPoll),
  };
}
