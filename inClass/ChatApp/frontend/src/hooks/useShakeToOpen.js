/**
 * useShakeToOpen: listens to the accelerometer (expo-sensors, works in Expo
 * Go) and calls `onShake` when the phone is shaken. Only subscribed while
 * `enabled`, so it costs nothing when the Profile toggle is off.
 */
import { Accelerometer } from 'expo-sensors';
import { useEffect } from 'react';
import { SHAKE } from '../constants/config';
import { createShakeDetector } from '../debug/shakeDetector';
import { log } from '../utils/logger';

/**
 * @param {boolean} enabled
 * @param {() => void} onShake a stable function (a store action)
 */
export function useShakeToOpen(enabled, onShake) {
  useEffect(() => {
    if (!enabled) return undefined;
    const detector = createShakeDetector(SHAKE);
    let subscription;
    try {
      Accelerometer.setUpdateInterval(SHAKE.sampleMs);
      subscription = Accelerometer.addListener((reading) => {
        if (detector.sample(reading, Date.now())) onShake();
      });
    } catch (error) {
      log.warn(`shake to open unavailable: ${error?.message ?? error}`);
    }
    return () => subscription?.remove();
  }, [enabled, onShake]);
}
