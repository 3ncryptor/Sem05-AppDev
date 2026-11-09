/**
 * usePolling: runs `task` every `intervalMs` while the screen is mounted and
 * the app is in the foreground (AppState). Built on createPoller, which
 * skips overlapping runs. Pass a stable function (a store action).
 * Inspector > tools > pause polling stops every pausable poll.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { toolsStore } from '../debug/toolsStore';
import { createPoller } from '../utils/poller';
import { useStore } from './useStore';

/**
 * @param {() => Promise<void>} task
 * @param {number} intervalMs
 * @param {boolean} [enabled=true]
 * @param {{ pausable?: boolean }} [options] false keeps polling while paused (Inspector's own polls)
 */
export function usePolling(task, intervalMs, enabled = true, { pausable = true } = {}) {
  const isPaused = useStore(toolsStore, (state) => state.pausePolling) && pausable;
  const isRunning = enabled && !isPaused;

  useEffect(() => {
    if (!isRunning) return undefined;
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
  }, [task, intervalMs, isRunning]);
}
