/**
 * RingButton: the round icon button used everywhere (design.md 6.2).
 * Variants: "slab" (on dark headers and bars), "surface" (on the light
 * background) and "accent" (gradient fill for the main action).
 */
import { StyleSheet, View } from 'react-native';
import { shadow } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from './Badge';
import { GradientFill } from './GradientFill';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon lucide icon component
 * @param {string} props.accessibilityLabel required: icon-only buttons need a label
 * @param {() => void} [props.onPress]
 * @param {'slab' | 'surface' | 'accent'} [props.variant='surface']
 * @param {number} [props.size=48]
 * @param {number} [props.badge] count shown in a gradient badge
 * @param {boolean} [props.disabled]
 */
export function RingButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = 48,
  badge,
  disabled,
}) {
  const { colors } = useTheme();
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const iconColor = variant === 'surface' ? colors.textPrimary : '#FFFFFF';

  const content = <Icon as={icon} color={iconColor} size={Math.round(size * 0.46)} />;

  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel}>
      {variant === 'accent' ? (
        <GradientFill style={[styles.center, circle]}>{content}</GradientFill>
      ) : (
        <View
          style={[
            styles.center,
            circle,
            variant === 'slab'
              ? { backgroundColor: colors.slab, borderWidth: 1, borderColor: colors.ringOnSlab }
              : {
                  backgroundColor: colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.ringOnSurface,
                  ...shadow(2, colors.shadow),
                },
          ]}
        >
          {content}
        </View>
      )}
      <Badge
        count={badge}
        ringColor={variant === 'slab' ? colors.slab : colors.surface}
        style={styles.badge}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, left: -4 },
});
