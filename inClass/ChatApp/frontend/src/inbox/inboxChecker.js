/**
 * createInboxChecker: checks every chat's newest page in turn (V5).
 *
 * One request at a time, spaced so a full cycle covers every chat once
 * (10 s by default: with 5 chats that is one request every 2 s, never a
 * burst). The open chat is skipped because it polls itself. A chat that keeps
 * failing is skipped for longer and longer, without slowing the others.
 * Plain JS with injectable timers, so it is tested without React;
 * useInboxChecker wires it to the app.
 */
import { backoffMs, checkGapMs, nextChatToCheck } from './inboxLogic';

/**
 * @param {object} options
 * @param {() => string[]} options.getChatIds
 * @param {() => string | null} options.getOpenId
 * @param {() => number} options.getCycleMs
 * @param {() => boolean} options.isEnabled paused, switched off, or offline
 * @param {(chatId: string) => number} options.getFailures failures in a row for that chat
 * @param {(chatId: string) => Promise<void>} options.check fetch + record (never throws)
 * @param {{ setTimeout: Function, clearTimeout: Function }} [options.timers]
 */
export function createInboxChecker({
  getChatIds,
  getOpenId,
  getCycleMs,
  isEnabled,
  getFailures,
  check,
  timers = globalThis,
}) {
  let handle = null;
  let lastId = null;
  let isStopped = true;
  // Bumped by start() and stop(): a run that was awaiting a request when the
  // app went to the background must not reschedule into a second loop.
  let generation = 0;
  /** chatId -> earliest time it may be checked again (back off per chat). */
  const notBefore = new Map();

  function schedule(delayMs) {
    if (isStopped) return;
    handle = timers.setTimeout(run, delayMs);
  }

  function eligible(ids, now) {
    return ids.filter((id) => (notBefore.get(id) ?? 0) <= now);
  }

  async function run() {
    handle = null;
    const myGeneration = generation;
    const ids = getChatIds();
    const cycleMs = getCycleMs();
    const now = Date.now();
    const chatId = isEnabled() ? nextChatToCheck(eligible(ids, now), lastId, getOpenId()) : null;
    if (!chatId) {
      schedule(cycleMs);
      return;
    }
    lastId = chatId;
    try {
      await check(chatId);
    } catch {
      // check records its own failures; this only keeps the loop alive
    }
    if (myGeneration !== generation) return;
    const gap = checkGapMs(cycleMs, ids.length);
    // A failing chat waits on its own; the others keep their pace.
    const wait = backoffMs(getFailures(chatId), cycleMs);
    if (wait) notBefore.set(chatId, Date.now() + wait);
    else notBefore.delete(chatId);
    schedule(gap);
  }

  return {
    start() {
      if (!isStopped) return;
      isStopped = false;
      generation += 1;
      schedule(0);
    },
    stop() {
      isStopped = true;
      generation += 1;
      if (handle !== null) timers.clearTimeout(handle);
      handle = null;
    },
  };
}
