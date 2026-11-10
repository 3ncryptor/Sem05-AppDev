/**
 * PulseLine: the background checks as a heartbeat (buildPlan.md 15, logs).
 * An SVG trace; each new check draws one bright beat across it, so the
 * rhythm of polling is visible. Replaces the old heartbeat text row, keeping
 * the counts under it. Still when nothing is checking; still with reduce motion.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { fonts, gradient, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatAgo } from '../../utils/format';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const HEIGHT = 34;
const BEAT_MS = 700;
const TRACE_LENGTH = 600;

/** A flat line with one heartbeat blip in the middle, sized to the width. */
function tracePath(width) {
  const mid = width / 2;
  const base = HEIGHT / 2;
  return [
    `M0 ${base}`,
    `L${mid - 30} ${base}`,
    `L${mid - 20} ${base - 6}`,
    `L${mid - 12} ${base + 4}`,
    `L${mid - 4} ${base - 13}`,
    `L${mid + 4} ${base + 10}`,
    `L${mid + 12} ${base}`,
    `L${width} ${base}`,
  ].join(' ');
}

/**
 * @param {object} props
 * @param {{ checks: number, failures: number, lastAt: number, byKind: Record<string, number> }} props.heartbeat
 * @param {number} props.now
 */
export function PulseLine({ heartbeat, now }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(TRACE_LENGTH);

  useEffect(() => {
    if (!heartbeat.checks || reduceMotion) return;
    offset.set(
      withSequence(
        withTiming(TRACE_LENGTH, { duration: 0 }),
        withTiming(-TRACE_LENGTH, { duration: BEAT_MS, easing: Easing.linear }),
      ),
    );
  }, [heartbeat.checks, reduceMotion, offset]);

  const beatProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  if (!heartbeat.checks) return null;

  const ok = heartbeat.checks - heartbeat.failures;
  const kinds = Object.entries(heartbeat.byKind)
    .map(([kind, count]) => `${kind} ${count}`)
    .join(' · ');

  return (
    <View
      style={[styles.card, { backgroundColor: colors.slabRaised }]}
      accessibilityLabel={`${ok} background checks ok, last ${formatAgo(heartbeat.lastAt, now)}`}
    >
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width ? (
          <Svg width={width} height={HEIGHT}>
            <Path d={tracePath(width)} stroke={colors.slab} strokeWidth={2} fill="none" />
            <AnimatedPath
              d={tracePath(width)}
              stroke={heartbeat.failures ? colors.dangerOnSlab : gradient.colors[1]}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={[TRACE_LENGTH / 4, TRACE_LENGTH * 2]}
              animatedProps={beatProps}
            />
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
      </View>
      <Text style={[styles.main, { color: colors.textOnSlab }]}>
        {ok} background checks · {heartbeat.failures ? `${heartbeat.failures} failed · ` : ''}last{' '}
        {formatAgo(heartbeat.lastAt, now)}
      </Text>
      <Text style={[styles.kinds, { color: colors.textOnSlabMuted }]}>{kinds}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.bubble, padding: space.sm, gap: 4 },
  main: { fontFamily: fonts.medium, fontSize: 13 },
  kinds: { fontFamily: fonts.regular, fontSize: 11 },
});
