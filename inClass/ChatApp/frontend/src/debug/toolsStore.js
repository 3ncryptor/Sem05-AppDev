/**
 * toolsStore: the Inspector's demo switches (buildPlan.md 6.4). Kept in
 * memory only, so a restart always brings the app back to normal.
 * - pausePolling stops chat and room polls (the Inspector's own polls keep going)
 * - simulateOffline makes every request fail as if the network were down
 * - pollMs overrides the chat, room and inbox poll intervals
 * - inboxChecks switches the background check of every chat off (e.g. on the
 *   shared class server, where 200 phones add up)
 * - islandWire runs a dot across the notch island for every request
 */
import { POLL_MS } from '../constants/config';
import { createStore } from '../store/createStore';
import { log } from '../utils/logger';

export const DEFAULT_TOOLS = {
  pausePolling: false,
  simulateOffline: false,
  inboxChecks: true,
  islandWire: false,
  pollMs: {
    conversations: POLL_MS.conversations,
    messages: POLL_MS.messages,
    inbox: POLL_MS.inbox,
  },
};

export const toolsStore = createStore(DEFAULT_TOOLS);

/** @param {Partial<typeof DEFAULT_TOOLS>} patch */
export function setTools(patch) {
  toolsStore.set(patch);
  log.state(`tools: ${JSON.stringify(patch)}`);
}

/**
 * @param {'conversations' | 'messages' | 'inbox'} key
 * @param {number} ms
 */
export function setPollInterval(key, ms) {
  setTools({ pollMs: { ...toolsStore.get().pollMs, [key]: ms } });
}
