/**
 * Chip: a 30-high label pill (design.md 6.8).
 * - "surface": on the light background, surfaceRaised fill.
 * - "frosted": on images and slabs, a translucent blurred fill with white text.
 * Pass `selected` to fill it with the ink colour (filters, picked members).
 */
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { radius, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from './PressableScale';

const HEIGHT = 30;
const FROSTED_FILL = 'rgba(255,255,255,0.22)';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {'surface' | 'frosted'} [props.variant='surface']
 * @param {boolean} [props.selected]
 * @param {() => void} [props.onPress] makes the chip tappable
 */
export function Chip({ label, variant = 'surface', selected = false, onPress }) {
  const { colors, isDark } = useTheme();

  const chip =
    variant === 'frosted' ? (
      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.chip}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FROSTED_FILL }]} />
        <Text style={[type.chip, { color: '#FFFFFF' }]}>{label}</Text>
      </BlurView>
    ) : (
      <View
        style={[styles.chip, { backgroundColor: selected ? colors.ink : colors.surfaceRaised }]}
      >
        <Text style={[type.chip, { color: selected ? colors.onInk : colors.textSecondary }]}>
          {label}
        </Text>
      </View>
    );

  if (!onPress) return chip;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      {chip}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: HEIGHT,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
