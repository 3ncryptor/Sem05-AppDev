/**
 * useMessages: one controller per open chat (created once with a useState
 * initializer), its state through useStore, the first load in useEffect and
 * a poll every POLL_MS.messages via usePolling.
 */
import { useEffect, useState } from 'react';
import { POLL_MS } from '../constants/config';
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

  usePolling(controller.poll, POLL_MS.messages, state.status !== 'loading');

  return { ...state, ...controller };
}
