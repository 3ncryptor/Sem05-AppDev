/**
 * FloatingBar: the dark pill that floats above the bottom safe area
 * (design.md 6.6 tab bar and 6.10 control bar). It is only the container;
 * callers put ring buttons or a SegmentedPill inside.
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const BAR_HEIGHT = 72;

/**
 * @param {object} props
 * @param {boolean} [props.floating=true] pin to the bottom of the screen; false renders inline
 * @param {object} [props.style]
 * @param {import('react').ReactNode} props.children
 */
export function FloatingBar({ floating = true, style, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const position = floating
    ? { position: 'absolute', alignSelf: 'center', bottom: insets.bottom + space.md }
    : { alignSelf: 'center' };

  return (
    <View
      style={[
        styles.bar,
        position,
        { backgroundColor: colors.slab, ...shadow(3, colors.shadow) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    paddingHorizontal: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
