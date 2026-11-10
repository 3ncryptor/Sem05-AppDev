/**
 * useShake: the error shake from design.md 8 (+-8 pt, three times, 300 ms).
 * Returns an animated style to spread on an Animated.View and a `shake()`
 * trigger. With "reduce motion" on, it does nothing; the error text alone
 * carries the message.
 */
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { durations, SHAKE_DISTANCE } from '../constants/motion';

const STEPS = 6;

export function useShake() {
  const offset = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  function shake() {
    if (reduceMotion) return;
    const step = durations.shake / STEPS;
    offset.set(
      withSequence(
        withTiming(-SHAKE_DISTANCE, { duration: step / 2 }),
        withTiming(SHAKE_DISTANCE, { duration: step }),
        withTiming(-SHAKE_DISTANCE, { duration: step }),
        withTiming(SHAKE_DISTANCE, { duration: step }),
        withTiming(-SHAKE_DISTANCE / 2, { duration: step }),
        withTiming(0, { duration: step / 2 }),
      ),
    );
  }

  return { animatedStyle, shake };
}
