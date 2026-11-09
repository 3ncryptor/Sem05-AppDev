/**
 * PrimaryButton: the full-width 56-high pill for a screen's main action.
 * States: idle (label), loading (spinner, presses ignored) and success
 * (check icon). Variant "ink" is the quiet default; "accent" uses the
 * gradient and should appear at most once per screen; "onSlab" is the
 * quiet button on dark slabs and sheets, where ink would disappear.
 */
import Check from 'lucide-react-native/icons/check';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { fonts, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { GradientFill } from './GradientFill';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

const HEIGHT = 56;

/**
 * @param {object} props
 * @param {string} props.label
 * @param {() => void} [props.onPress]
 * @param {'idle' | 'loading' | 'success'} [props.status='idle']
 * @param {'ink' | 'accent' | 'onSlab'} [props.variant='ink']
 * @param {boolean} [props.disabled]
 */
export function PrimaryButton({ label, onPress, status = 'idle', variant = 'ink', disabled }) {
  const { colors } = useTheme();
  const textColor =
    variant === 'accent' ? '#FFFFFF' : variant === 'onSlab' ? colors.textOnSlab : colors.onInk;
  const fill = variant === 'onSlab' ? colors.slabRaised : colors.ink;
  const isBusy = status !== 'idle';

  const content =
    status === 'loading' ? (
      <ActivityIndicator color={textColor} accessibilityLabel="Loading" />
    ) : status === 'success' ? (
      <Animated.View entering={ZoomIn.springify()}>
        <Icon as={Check} color={textColor} size={24} />
      </Animated.View>
    ) : (
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    );

  return (
    <PressableScale
      onPress={isBusy ? undefined : onPress}
      disabled={disabled}
      scaleTo={0.97}
      accessibilityLabel={label}
    >
      {variant === 'accent' ? (
        <GradientFill style={styles.pill}>{content}</GradientFill>
      ) : (
        <View style={[styles.pill, { backgroundColor: fill }]}>{content}</View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: HEIGHT,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
});
