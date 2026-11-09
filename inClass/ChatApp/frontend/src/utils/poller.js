/**
 * createPoller: runs an async task every `intervalMs` (buildPlan.md 8,
 * Polling). Plain JS so it can be tested without React:
 * - never runs two tasks at once (a slow request skips the next tick)
 * - pause()/resume() for when the app goes to the background
 * - stop() for unmount
 * Timers are injectable for tests.
 */

/**
 * @param {object} options
 * @param {() => Promise<void>} options.task
 * @param {number} options.intervalMs
 * @param {{ setInterval: Function, clearInterval: Function }} [options.timers]
 */
export function createPoller({ task, intervalMs, timers = globalThis }) {
  let handle = null;
  let isRunning = false;

  async function tick() {
    if (isRunning) return;
    isRunning = true;
    try {
      await task();
    } finally {
      isRunning = false;
    }
  }

  // Tasks log their own failures (the stores do); this only stops a
  // rejected tick from surfacing as an unhandled promise rejection.
  function safeTick() {
    tick().catch(() => {});
  }

  function start() {
    if (handle !== null) return;
    handle = timers.setInterval(safeTick, intervalMs);
  }

  function stop() {
    if (handle === null) return;
    timers.clearInterval(handle);
    handle = null;
  }

  return {
    start,
    stop,
    pause: stop,
    /** Resume and run once straight away, so data is fresh after the app returns. */
    resume() {
      start();
      safeTick();
    },
    tick,
    isActive: () => handle !== null,
  };
}
