/**
 * PressableScale: the base of every tappable element. Shrinks slightly on
 * press with a spring (design.md 8) and can play a light haptic.
 */
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PRESS_SCALE, springs } from '../../constants/motion';
import { haptics } from '../../utils/haptics';

/**
 * @param {object} props
 * @param {() => void} [props.onPress]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.haptic=true] play a light haptic on press
 * @param {number} [props.scaleTo] how far to shrink (default PRESS_SCALE)
 * @param {object} [props.style] style of the animated wrapper
 * @param {string} [props.accessibilityLabel]
 * @param {import('react').ReactNode} props.children
 */
export function PressableScale({
  onPress,
  disabled = false,
  haptic = true,
  scaleTo = PRESS_SCALE,
  style,
  accessibilityLabel,
  children,
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    if (haptic) haptics.tap();
    onPress?.();
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => scale.set(withSpring(scaleTo, springs.press))}
        onPressOut={() => scale.set(withSpring(1, springs.press))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
