/**
 * useConnectionTest: checks whether a backend answers at a URL
 * (GET /user without auth; a 401 counts as reachable).
 * Late answers for an old URL are ignored, so switching servers quickly
 * never shows a stale result.
 */
import { useState } from 'react';
import { testConnection } from '../api/health';
import { log } from '../utils/logger';

/** @typedef {'idle' | 'checking' | 'ok' | 'fail'} ConnectionState */

// Counter shared at module level: the login screen is the only user of this hook.
let latestCheck = 0;

export function useConnectionTest() {
  const [result, setResult] = useState({ state: 'idle', message: '' });

  /** @param {string | null} baseUrl */
  async function check(baseUrl) {
    latestCheck += 1;
    const checkId = latestCheck;
    if (!baseUrl) {
      setResult({ state: 'fail', message: 'No address to test.' });
      return;
    }
    setResult({ state: 'checking', message: '' });
    const outcome = await testConnection(baseUrl);
    if (checkId !== latestCheck) return;
    setResult(
      outcome.ok ? { state: 'ok', message: '' } : { state: 'fail', message: outcome.message },
    );
    log.app(`connection test ${baseUrl}: ${outcome.ok ? 'reachable' : outcome.message}`);
  }

  function reset() {
    latestCheck += 1;
    setResult({ state: 'idle', message: '' });
  }

  return { ...result, check, reset };
}
