/**
 * Slab: the near-black "soft slab" material (design.md 6.1).
 * - variant "notch": full-width header flush with the top, under the status
 *   bar, with only the bottom corners rounded.
 * - variant "card": a free-standing rounded block (feed card footers, sheets).
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

/**
 * @param {object} props
 * @param {'notch' | 'card'} [props.variant='card']
 * @param {object} [props.style]
 * @param {import('react').ReactNode} [props.children]
 */
export function Slab({ variant = 'card', style, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const shape =
    variant === 'notch'
      ? {
          paddingTop: insets.top + space.xs,
          borderBottomLeftRadius: radius.slab,
          borderBottomRightRadius: radius.slab,
        }
      : { borderRadius: radius.slab };

  return (
    <View style={[styles.base, shape, { backgroundColor: colors.slab }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: space.md, paddingBottom: space.md },
});
