/**
 * Badge: a small gradient circle with a count (design.md 6.11).
 * Renders nothing for zero, so callers can always pass the raw count.
 * It pops in softly when it appears, and a new count fades in rather than
 * snapping (W6).
 */
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { durations, softPop } from '../../constants/motion';
import { fonts } from '../../constants/theme';
import { formatBadgeCount } from '../../utils/format';
import { GradientFill } from './GradientFill';

const SIZE = 20;
const BADGE_IN = softPop(durations.fast);
const COUNT_IN = FadeIn.duration(durations.fast);

/**
 * @param {object} props
 * @param {number} props.count
 * @param {string} props.ringColor background colour behind the badge (draws a 2 px ring)
 * @param {object} [props.style] position the badge (usually absolute)
 * @param {boolean} [props.isAnimated=true] false inside virtualized list rows, where a
 *   recycled row would replay the pop while scrolling
 */
export function Badge({ count, ringColor, style, isAnimated = true }) {
  const label = formatBadgeCount(count);
  if (!label) return null;

  return (
    <Animated.View entering={isAnimated ? BADGE_IN : undefined} style={style}>
      <GradientFill style={[styles.badge, { borderColor: ringColor }]}>
        <Animated.Text
          key={label}
          entering={isAnimated ? COUNT_IN : undefined}
          style={styles.label}
          accessibilityLabel={`${count} new`}
        >
          {label}
        </Animated.Text>
      </GradientFill>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 11 },
});
