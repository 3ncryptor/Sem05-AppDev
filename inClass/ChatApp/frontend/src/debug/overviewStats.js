/**
 * overviewStats: the numbers and the one plain sentence on the Inspector's
 * overview tab (buildPlan.md 15, screen 2). Pure, so they are tested.
 */

const MINUTE = 60000;
const TYPICAL_SAMPLE = 20;

/**
 * @param {object[]} requests networkStore rows, oldest first
 * @param {number} [now]
 * @returns {{ perMinute: number, failed: number, typicalMs: number | null }}
 */
export function overviewStats(requests, now = Date.now()) {
  const recent = requests.filter((row) => now - row.startedAt <= MINUTE);
  const timings = requests
    .filter((row) => row.state === 'ok' && Number.isFinite(row.durationMs))
    .slice(-TYPICAL_SAMPLE)
    .map((row) => row.durationMs)
    .sort((a, b) => a - b);
  return {
    perMinute: recent.length,
    failed: recent.filter((row) => row.state === 'error').length,
    typicalMs: timings.length ? timings[Math.floor((timings.length - 1) / 2)] : null,
  };
}

/**
 * @param {object} input
 * @param {'ok' | 'bad' | 'idle'} input.tone from summarizeConnection
 * @param {number} input.failed failures in the last minute
 * @param {{ conversations: number }} input.pollMs
 * @param {boolean} input.isPaused Inspector > tools > pause polling
 * @returns {string}
 */
export function overviewSentence({ tone, failed, pollMs, isPaused }) {
  const every = `every ${Math.round(pollMs.conversations / 1000)} seconds`;
  if (isPaused) {
    return 'Polling is paused, so the app is not asking for new data. Turn it back on in tools.';
  }
  if (tone === 'idle') return 'Waiting for the first request to the server.';
  if (tone === 'bad') return `The app can't reach the server right now. It keeps trying ${every}.`;
  if (failed) {
    const what = failed === 1 ? '1 request' : `${failed} requests`;
    return `The app asks the server for new data ${every}. ${what} failed in the last minute.`;
  }
  return `The app asks the server for new data ${every}. Everything is working.`;
}

/**
 * @param {object[]} requests oldest first
 * @returns {object | null} the newest failed request
 */
export function lastProblem(requests) {
  for (let index = requests.length - 1; index >= 0; index -= 1) {
    if (requests[index].state === 'error') return requests[index];
  }
  return null;
}
