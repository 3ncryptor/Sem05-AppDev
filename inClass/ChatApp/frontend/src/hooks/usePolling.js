/**
 * usePolling: runs `task` every `intervalMs` while the screen is mounted and
 * the app is in the foreground (AppState). Built on createPoller, which
 * skips overlapping runs. Pass a stable function (a store action).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createPoller } from '../utils/poller';

/**
 * @param {() => Promise<void>} task
 * @param {number} intervalMs
 * @param {boolean} [enabled=true]
 */
export function usePolling(task, intervalMs, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const poller = createPoller({ task, intervalMs });
    poller.start();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') poller.resume();
      else poller.pause();
    });

    return () => {
      subscription.remove();
      poller.stop();
    };
  }, [task, intervalMs, enabled]);
}
