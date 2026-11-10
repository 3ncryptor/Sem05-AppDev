/**
 * IslandRing: the "something arrived" moment (W2). A thin gradient-coloured
 * ring leaves the island once and fades as it grows (600 ms). One per
 * arrival, never repeated, and not drawn with reduce motion.
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT } from '../../constants/motion';
import { island } from './islandTheme';

const RING_MS = 600;
const START_OPACITY = 0.45;
const GROW_TO = 1.35;

/**
 * @param {object} props
 * @param {number} props.arrivalId bumps once per arrival (0 = nothing yet)
 * @param {{ width: number, height: number }} props.shape the compact shape it leaves from
 * @param {number} props.left x of the shape's left edge
 */
export function IslandRing({ arrivalId, shape, left }) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!arrivalId) return;
    progress.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: RING_MS, easing: EASE_OUT }),
      ),
    );
  }, [arrivalId, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: START_OPACITY * (1 - progress.get()),
    // one transform list: a second static one in the style array would be overwritten
    transform: [{ translateX: left }, { scale: 1 + (GROW_TO - 1) * progress.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: shape.width,
          height: shape.height,
          borderRadius: shape.height / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 1.5,
    borderColor: island.accent,
  },
});
