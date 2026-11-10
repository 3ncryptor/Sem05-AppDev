/**
 * networkDetail: pure helpers for the network tab's devtools-style views
 * (buildPlan.md 15, screen 5): safe headers, "copy as cURL", the timing split
 * and the waterfall column.
 */

/**
 * A copy of the headers with the Basic auth password replaced.
 * @param {Record<string, string>} headers
 * @param {string} name the signed-in user (who is shown)
 * @returns {Record<string, string>}
 */
export function redactHeaders(headers, name) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) =>
      key.toLowerCase() === 'authorization' ? [key, `Basic ${name || '?'}:<hidden>`] : [key, value],
    ),
  );
}

/** Wraps a value in single quotes for a shell, escaping single quotes inside. */
function quote(text) {
  return `'${String(text).replace(/'/g, "'\\''")}'`;
}

/**
 * The request as a curl command. This backend reads the raw header
 * "Authorization: Basic name:password" (not base64), so the header is written
 * that way, with the user the request really used and a password placeholder.
 * @param {{ method: string, url: string, requestHeaders?: Record<string, string>,
 *   requestBody?: unknown }} row
 * @returns {string}
 */
export function toCurl(row) {
  const headers = row.requestHeaders ?? {};
  const parts = [`curl -X ${row.method} ${quote(row.url)}`];
  Object.entries(headers).forEach(([key, value]) => {
    const isAuth = key.toLowerCase() === 'authorization';
    const user = isAuth
      ? String(value)
          .replace(/^Basic\s+/, '')
          .split(':')[0]
      : '';
    parts.push(
      isAuth
        ? `-H ${quote(`Authorization: Basic ${user}:YOUR_PASSWORD`)}`
        : `-H ${quote(`${key}: ${value}`)}`,
    );
  });
  if (row.requestBody !== undefined && row.requestBody !== null) {
    parts.push(`-d ${quote(JSON.stringify(row.requestBody))}`);
  }
  return parts.join(' \\\n  ');
}

/**
 * @param {{ durationMs?: number, ttfbMs?: number }} row
 * @returns {{ waitingMs: number, downloadMs: number }} waiting = until the reply started
 */
export function timingParts({ durationMs = 0, ttfbMs }) {
  if (!Number.isFinite(ttfbMs)) return { waitingMs: durationMs, downloadMs: 0 };
  return { waitingMs: ttfbMs, downloadMs: Math.max(0, durationMs - ttfbMs) };
}

const MIN_SPAN_MS = 1;

/**
 * Where each request sits on one time axis (0..1), like devtools' waterfall.
 * Requests still in flight run until `now`.
 * @param {{ id: string, startedAt: number, durationMs?: number, state?: string }[]} rows
 * @param {number} [now]
 * @returns {Record<string, { left: number, width: number }>}
 */
export function waterfall(rows, now = Date.now()) {
  if (!rows.length) return {};
  const end = (row) => (row.state === 'pending' ? now : row.startedAt + (row.durationMs ?? 0));
  const start = Math.min(...rows.map((row) => row.startedAt));
  const finish = Math.max(...rows.map(end));
  const span = Math.max(MIN_SPAN_MS, finish - start);
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        left: (row.startedAt - start) / span,
        width: Math.max(MIN_SPAN_MS, end(row) - row.startedAt) / span,
      },
    ]),
  );
}
