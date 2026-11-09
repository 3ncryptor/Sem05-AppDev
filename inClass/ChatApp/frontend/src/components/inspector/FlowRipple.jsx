/**
 * FlowRipple: an expanding ring on the server's helper node when it logs
 * background work (FactBot replies, read receipts, file cleanup).
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FLOW_RIPPLE_MS } from '../../constants/config';
import { gradient } from '../../constants/theme';

const SIZE = 40;
const COLORS = {
  bot: gradient.colors[2],
  receipts: gradient.colors[1],
  cleanup: gradient.colors[0],
};

/** @param {{ kind: 'bot' | 'receipts' | 'cleanup', speed: number }} props */
export function FlowRipple({ kind, speed }) {
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.set(withTiming(1, { duration: reduceMotion ? 0 : FLOW_RIPPLE_MS * speed }));
  }, [grow, reduceMotion, speed]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - grow.get(),
    transform: [{ scale: 0.6 + grow.get() * 1.6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { borderColor: COLORS[kind] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
  },
});
