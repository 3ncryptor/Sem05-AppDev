/**
 * useNow: the current time, refreshed every `intervalMs` while enabled.
 * Lets time-window views (Live Wire dots and ripples) drop old items.
 */
import { useEffect, useState } from 'react';

/**
 * @param {number} intervalMs
 * @param {boolean} [enabled=true]
 * @returns {number} Date.now() at the last tick
 */
export function useNow(intervalMs, enabled = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
