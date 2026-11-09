/**
 * useMessages: one controller per open chat (created once with a useState
 * initializer), its state through useStore, the first load in useEffect and
 * a poll every few seconds (Inspector > tools sets the interval).
 */
import { useEffect, useState } from 'react';
import { toolsStore } from '../debug/toolsStore';
import { createMessageController } from '../store/messageController';
import { usePolling } from './usePolling';
import { useStore } from './useStore';

/**
 * @param {string} conversationId
 * @param {string} myId
 */
export function useMessages(conversationId, myId) {
  const [controller] = useState(() => createMessageController({ conversationId, myId }));
  const state = useStore(controller.store);

  useEffect(() => {
    controller.loadInitial();
  }, [controller]);

  const pollMs = useStore(toolsStore, (tools) => tools.pollMs.messages);
  usePolling(controller.poll, pollMs, state.status !== 'loading');

  return { ...state, ...controller };
}
