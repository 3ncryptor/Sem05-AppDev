/**
 * PressableScale: the base of every tappable element. Shrinks slightly on
 * press-in (120 ms ease-out, 3%: felt more than seen) and can play a light
 * haptic. Feedback on press-in, the action on press-out.
 */
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, EASE_OUT, PRESS_SCALE } from '../../constants/motion';
import { haptics } from '../../utils/haptics';

const PRESS_TIMING = { duration: durations.press, easing: EASE_OUT };
const PRESS_RETENTION = 16;

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
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function handlePress() {
    if (haptic) haptics.tap();
    onPress?.();
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => scale.set(withTiming(scaleTo, PRESS_TIMING))}
        onPressOut={() => scale.set(withTiming(1, PRESS_TIMING))}
        pressRetentionOffset={PRESS_RETENTION}
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
