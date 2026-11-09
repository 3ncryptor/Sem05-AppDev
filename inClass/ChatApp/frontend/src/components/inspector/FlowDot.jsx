/**
 * FlowDot: one request travelling the Live Wire. It runs phone -> db on the
 * upper lane while pending, then db -> phone on the lower lane once the
 * reply is in, carrying its status time ("84ms"), and fades out.
 * Gradient = something sent, white = a read, small grey = a poll;
 * the reply turns green for ok and red for an error.
 */
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { FLOW_LEG_MS } from '../../constants/config';
import { fonts, gradient } from '../../constants/theme';
import { dotKind } from '../../debug/flowEvents';
import { useTheme } from '../../hooks/useTheme';

const SIZES = { poll: 8, read: 12, send: 14 };
const HIT = 28;

/**
 * @param {object} props
 * @param {object} props.row networkStore row
 * @param {{ fromX: number, toX: number, upperY: number, lowerY: number }} props.track
 * @param {number} props.speed 1 normal, higher is slower
 * @param {boolean} props.isSelected
 * @param {(id: string) => void} props.onPick
 */
export function FlowDot({ row, track, speed, isSelected, onPick }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const kind = dotKind(row);
  const size = SIZES[kind];
  const isDone = row.state !== 'pending';

  useEffect(() => {
    const leg = reduceMotion ? 0 : FLOW_LEG_MS * speed;
    if (!isDone) {
      progress.set(withTiming(1, { duration: leg }));
      return;
    }
    const remaining = Math.max(0, 1 - progress.get()) * leg;
    progress.set(
      withSequence(withTiming(1, { duration: remaining }), withTiming(2, { duration: leg })),
    );
  }, [isDone, speed, reduceMotion, progress]);

  const moving = useAnimatedStyle(() => {
    const p = progress.get();
    const out = p <= 1;
    const x = out
      ? interpolate(p, [0, 1], [track.fromX, track.toX])
      : interpolate(p, [1, 2], [track.toX, track.fromX]);
    return {
      opacity: interpolate(p, [0, 0.05, 1.85, 2], [0, 1, 1, 0]),
      transform: [
        { translateX: x - HIT / 2 },
        { translateY: (out ? track.upperY : track.lowerY) - HIT / 2 },
      ],
    };
  });

  const label = useAnimatedStyle(() => ({ opacity: progress.get() > 1 ? 1 : 0 }));

  const replyColor = row.state === 'error' ? colors.danger : colors.success;
  const outColor =
    kind === 'send' ? gradient.colors[1] : kind === 'read' ? '#FFFFFF' : colors.textOnSlabMuted;

  return (
    <Animated.View style={[styles.hit, moving]} pointerEvents="box-none">
      <Pressable
        onPress={() => onPick(row.id)}
        hitSlop={6}
        style={styles.hitArea}
        accessibilityRole="button"
        accessibilityLabel={`${row.method} ${row.path}, explain this request`}
      >
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isDone ? replyColor : outColor,
              borderWidth: isSelected ? 2 : 0,
              borderColor: '#FFFFFF',
            },
          ]}
        />
      </Pressable>
      {isDone && kind !== 'poll' ? (
        <Animated.Text style={[styles.label, { color: replyColor }, label]}>
          {row.durationMs}ms
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', top: 0, left: 0, width: HIT, alignItems: 'center' },
  hitArea: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.mono, fontSize: 9, marginTop: -4 },
});
