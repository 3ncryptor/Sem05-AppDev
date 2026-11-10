/**
 * Slab: the near-black "soft slab" material (design.md 6.1).
 * - variant "notch": full-width header flush with the top, under the status
 *   bar, with only the bottom corners rounded.
 * - variant "card": a free-standing rounded block (feed card footers, sheets).
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { registerNotch, reportNotchHeight } from '../../store/notchStore';

/**
 * @param {object} props
 * @param {'notch' | 'card'} [props.variant='card']
 * @param {object} [props.style]
 * @param {import('react').ReactNode} [props.children]
 */
export function Slab({ variant = 'card', style, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // animation-only ref: lets the Inspector measure this notch to grow out of it
  const viewRef = useRef(null);

  useEffect(() => {
    if (variant !== 'notch') return undefined;
    return registerNotch(
      () =>
        new Promise((resolve) => {
          if (!viewRef.current) {
            resolve(null);
            return;
          }
          viewRef.current.measureInWindow((x, y, width, height) => resolve({ x, y, h: height }));
        }),
    );
  }, [variant]);
  const shape =
    variant === 'notch'
      ? {
          paddingTop: insets.top + space.xs,
          borderBottomLeftRadius: radius.slab,
          borderBottomRightRadius: radius.slab,
          // A hairline on the lower edge and a soft shadow, so the notch reads
          // as a layer above the surface in dark mode (transparent in light).
          borderWidth: StyleSheet.hairlineWidth,
          borderTopWidth: 0,
          borderColor: colors.slabEdge,
          ...shadow(2, colors.shadow),
        }
      : { borderRadius: radius.slab };

  return (
    <View
      ref={viewRef}
      style={[styles.base, shape, { backgroundColor: colors.slab }, style]}
      // the Inspector grows out of the notch, so it needs to know how tall it is
      onLayout={
        variant === 'notch'
          ? (event) => reportNotchHeight(event.nativeEvent.layout.height)
          : undefined
      }
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: space.md, paddingBottom: space.md },
});
