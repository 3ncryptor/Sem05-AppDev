/**
 * connectionSummary: one short line about the server connection, used by the
 * Inspector header and the island's glance card.
 *   "10.41.170.153:3000 · ok 24 ms" / "· unreachable" / "· waiting"
 */

/**
 * @param {string} baseUrl
 * @param {{ state: string, durationMs?: number } | undefined} lastRequest newest finished request
 * @returns {{ host: string, text: string, tone: 'ok' | 'bad' | 'idle' }}
 */
export function summarizeConnection(baseUrl, lastRequest) {
  const host = baseUrl ? baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'no server';
  if (!lastRequest) return { host, text: `${host} · waiting`, tone: 'idle' };
  if (lastRequest.state === 'error') return { host, text: `${host} · unreachable`, tone: 'bad' };
  return { host, text: `${host} · ok ${lastRequest.durationMs} ms`, tone: 'ok' };
}

/**
 * The newest request that has finished (ok or failed).
 * @param {object[]} requests networkStore rows, oldest first
 */
export function lastFinished(requests) {
  for (let index = requests.length - 1; index >= 0; index -= 1) {
    if (requests[index].state !== 'pending') return requests[index];
  }
  return undefined;
}
