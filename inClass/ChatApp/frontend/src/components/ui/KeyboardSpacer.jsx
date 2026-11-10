/**
 * KeyboardSpacer: an empty block under the composer that is exactly as tall
 * as the keyboard, frame by frame, so the message box rides on top of it and
 * the list above shrinks with it (buildPlan.md 13, V3).
 *
 * Why not KeyboardAvoidingView: Android in SDK 58 is always edge-to-edge, so
 * the window never resizes, and RN's version had no Android behaviour. The
 * keyboard controller reports the keyboard's real position on the UI thread,
 * so this follows the system curve instead of guessing a duration.
 *
 * When the keyboard is closed the block keeps the bottom safe-area inset, so
 * the composer clears the gesture bar; when it opens, the keyboard covers that
 * area and the inset is not added twice.
 */
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

/**
 * @param {object} props
 * @param {number} props.restingHeight height when the keyboard is closed (the bottom inset)
 */
export function KeyboardSpacer({ restingHeight }) {
  const { height } = useReanimatedKeyboardAnimation();
  const style = useAnimatedStyle(() => ({
    height: Math.max(restingHeight, -height.get()),
  }));
  return <Animated.View style={style} pointerEvents="none" />;
}
