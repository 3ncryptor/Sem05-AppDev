/**
 * toolsStore: the Inspector's demo switches (buildPlan.md 6.4). Kept in
 * memory only, so a restart always brings the app back to normal.
 * - pausePolling stops chat and room polls (the Inspector's own polls keep going)
 * - simulateOffline makes every request fail as if the network were down
 * - pollMs overrides the chat and room poll intervals
 */
import { POLL_MS } from '../constants/config';
import { createStore } from '../store/createStore';
import { log } from '../utils/logger';

export const DEFAULT_TOOLS = {
  pausePolling: false,
  simulateOffline: false,
  pollMs: { conversations: POLL_MS.conversations, messages: POLL_MS.messages },
};

export const toolsStore = createStore(DEFAULT_TOOLS);

/** @param {Partial<typeof DEFAULT_TOOLS>} patch */
export function setTools(patch) {
  toolsStore.set(patch);
  log.state(`tools: ${JSON.stringify(patch)}`);
}

/**
 * @param {'conversations' | 'messages'} key
 * @param {number} ms
 */
export function setPollInterval(key, ms) {
  setTools({ pollMs: { ...toolsStore.get().pollMs, [key]: ms } });
}
