/**
 * IslandGlyph: the small thing at the leading edge of a live activity (and
 * alone inside a circle): a face for a message, a status dot for the
 * connection, a turning arc while a photo uploads, an icon otherwise.
 *
 * The only motion here is functional: the arc turns while work is happening,
 * and the reconnecting dot breathes slowly (once every 2 s). Both stop when
 * the activity ends, and neither runs with reduce motion on.
 */
import Check from 'lucide-react-native/icons/check';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import Users from 'lucide-react-native/icons/users';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '../avatar/Avatar';
import { Icon } from '../ui/Icon';
import { island, toneColor } from './islandTheme';

const SPIN_MS = 900;
const BREATH_MS = 1000;
const DOT = 8;

function Spinner({ size }) {
  const turn = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return undefined;
    turn.set(withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(turn);
  }, [turn, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));
  return (
    <Animated.View style={style}>
      <Icon as={LoaderCircle} color={island.text} size={size} />
    </Animated.View>
  );
}

function StatusDot({ tone }) {
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const breathes = tone === 'warn' && !reduceMotion;
  useEffect(() => {
    if (!breathes) {
      opacity.set(1);
      return undefined;
    }
    opacity.set(withRepeat(withTiming(0.35, { duration: BREATH_MS }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, breathes]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.dot, { backgroundColor: toneColor(tone) }, style]} />;
}

/**
 * @param {object} props
 * @param {object} props.activity
 * @param {number} [props.size=22]
 */
export function IslandGlyph({ activity, size = 22 }) {
  switch (activity.kind) {
    case 'message':
      return <Avatar name={activity.sender} size={size} />;
    case 'connection':
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {activity.tone === 'success' ? (
            <Icon as={Check} color={island.success} size={size * 0.8} />
          ) : (
            <StatusDot tone={activity.tone} />
          )}
        </View>
      );
    case 'upload':
      return <Spinner size={size * 0.85} />;
    case 'failed':
      return <Icon as={CircleAlert} color={island.danger} size={size * 0.85} />;
    case 'newChat':
      return <Icon as={Users} color={island.accent} size={size * 0.85} />;
    default:
      return <Icon as={Check} color={island.success} size={size * 0.85} />;
  }
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
