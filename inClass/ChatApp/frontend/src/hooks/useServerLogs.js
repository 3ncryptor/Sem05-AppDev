/**
 * useServerLogs: while the Inspector is open, checks once whether the server
 * shares its logs, then polls every 2 s only if it does (buildPlan.md 6.5).
 * Re-checks when the server or user changes. Returns the serverLogStore state.
 */
import { useEffect } from 'react';
import { POLL_MS } from '../constants/config';
import { checkServerLogs, pollServerLogs, serverLogStore } from '../debug/serverLogStore';
import { sessionStore } from '../store/sessionStore';
import { usePolling } from './usePolling';
import { useStore } from './useStore';

/** @param {boolean} isOpen */
export function useServerLogs(isOpen) {
  const server = useStore(serverLogStore);
  const sessionKey = useStore(sessionStore, (s) => `${s.status}|${s.baseUrl}|${s.name}`);

  useEffect(() => {
    if (isOpen) checkServerLogs();
  }, [isOpen, sessionKey]);

  usePolling(pollServerLogs, POLL_MS.serverLogs, isOpen && server.status === 'available', {
    pausable: false,
  });

  return server;
}
