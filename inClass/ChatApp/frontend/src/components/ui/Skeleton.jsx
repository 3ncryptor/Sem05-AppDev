/**
 * Skeleton: a softly pulsing placeholder block shown while data loads.
 * Holds still when "reduce motion" is on.
 */
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

const PULSE_MS = 900;
const LOW = 0.45;

/**
 * @param {object} props
 * @param {number | string} [props.width='100%']
 * @param {number} props.height
 * @param {number} [props.radius=16]
 */
export function Skeleton({ width = '100%', height, radius = 16 }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(LOW, { duration: PULSE_MS }), -1, true));
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised },
        style,
      ]}
      accessibilityLabel="Loading"
    />
  );
}
