/**
 * IslandWire (debug, off by default): a small gradient dot runs along the
 * bottom of the island once for every request the app sends, so you can
 * watch the app talk to the server without opening the Inspector.
 * Inspector > tools > "requests in the island".
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { gradient } from '../../constants/theme';
import { networkStore } from '../../debug/networkStore';

const RUN_MS = 700;
const DOT = 4;

/** @param {{ width: import('react-native-reanimated').SharedValue<number> }} props */
export function IslandWire({ width }) {
  const run = useSharedValue(0);

  useEffect(() => {
    // The newest row's id, not the length: the list is capped, so its length stops growing.
    let lastId = networkStore.get().requests.at(-1)?.id;
    return networkStore.subscribe((state) => {
      const next = state.requests.at(-1)?.id;
      if (next && next !== lastId) {
        run.set(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: RUN_MS, easing: Easing.linear }),
          ),
        );
      }
      lastId = next;
    });
  }, [run]);

  const style = useAnimatedStyle(() => ({
    opacity: run.get() > 0 && run.get() < 1 ? 1 : 0,
    transform: [{ translateX: run.get() * (width.get() - DOT * 4) + DOT * 2 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 3,
    left: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: gradient.colors[1],
  },
});
