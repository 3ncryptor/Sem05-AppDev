/**
 * Badge: a small gradient circle with a count (design.md 6.11).
 * Renders nothing for zero, so callers can always pass the raw count.
 */
import { StyleSheet, Text } from 'react-native';
import { fonts } from '../../constants/theme';
import { formatBadgeCount } from '../../utils/format';
import { GradientFill } from './GradientFill';

const SIZE = 20;

/**
 * @param {object} props
 * @param {number} props.count
 * @param {string} props.ringColor background colour behind the badge (draws a 2 px ring)
 * @param {object} [props.style] position the badge (usually absolute)
 */
export function Badge({ count, ringColor, style }) {
  const label = formatBadgeCount(count);
  if (!label) return null;

  return (
    <GradientFill style={[styles.badge, { borderColor: ringColor }, style]}>
      <Text style={styles.label} accessibilityLabel={`${count} new`}>
        {label}
      </Text>
    </GradientFill>
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
