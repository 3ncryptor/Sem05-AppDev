/**
 * Sheet: a dark bottom sheet (top radius 44) over a dimmed background
 * (design.md 8 "Sheet open"). Tapping the scrim closes it, and so does
 * dragging the handle strip down (W6): the sheet follows the finger 1:1, the
 * dim fades with it, and a flick is enough; otherwise it settles back.
 * Only the handle strip drags, so lists inside (the Inspector) keep scrolling.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  SlideInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, EASE_OUT, EASE_SHEET, springs } from '../../constants/motion';
import { radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { project } from '../../island/islandGestures';

const SHEET_IN = SlideInDown.duration(durations.sheet).easing(EASE_SHEET);
const HANDLE_WIDTH = 40;
const GRAB_HEIGHT = 28;
/** Close when the drag (with its flick) would carry the sheet past this share of its height. */
const CLOSE_SHARE = 0.35;
/** The Modal's fade-out; the drag offset resets after it, out of sight. */
const MODAL_FADE_MS = 350;

function rubberband(offset, limit) {
  'worklet';
  return (offset * limit * 0.55) / (limit + 0.55 * Math.abs(offset));
}

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {object} [props.style] style of the sheet body (height, padding)
 * @param {import('react').ReactNode} props.children
 */
export function Sheet({ visible, onClose, style, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(1);
  const offset = useSharedValue(0);
  // animation-only: lets the fly-out check whether the parent really closed the sheet
  const isVisible = useRef(visible);

  useEffect(() => {
    isVisible.current = visible;
    if (visible) {
      offset.set(0);
      return undefined;
    }
    const timer = setTimeout(() => offset.set(0), MODAL_FADE_MS);
    return () => clearTimeout(timer);
  }, [visible, offset]);

  /** Closes; if the parent keeps the sheet open (a guard), it slides back instead of vanishing. */
  function closeFromDrag() {
    onClose();
    setTimeout(() => {
      if (isVisible.current) offset.set(withSpring(0, springs.settle));
    }, MODAL_FADE_MS);
  }

  const drag = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (event) => {
      'worklet';
      const y = event.translationY;
      offset.set(y >= 0 ? y : rubberband(y, height));
    },
    onDeactivate: (event) => {
      'worklet';
      const resting = offset.get() + project(event.velocityY);
      if (resting > height * CLOSE_SHARE) {
        offset.set(
          withTiming(height, { duration: durations.base, easing: EASE_OUT }, (finished) => {
            if (finished) scheduleOnRN(closeFromDrag);
          }),
        );
      } else {
        offset.set(withSpring(0, { ...springs.snap, velocity: event.velocityY }));
      }
    },
  });

  // A height like '88%' must sit on the outer (entering) view: on the inner one it would be
  // a percentage of an unsized wrapper.
  const sheetHeight = StyleSheet.flatten(style)?.height;
  const sizeStyle = sheetHeight === undefined ? null : { height: sheetHeight };
  const innerSize = sheetHeight === undefined ? null : styles.fill;

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, height], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // edge-to-edge Android: without these the window stops above the system bars and the
      // screen underneath (the chat's message box) shows through at the bottom
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* a Modal is its own window on Android: gestures need their own root here */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          {/* the entrance and the drag live on separate views: an entering animation and an
              animated transform on one view fight each other */}
          <Animated.View entering={SHEET_IN} style={sizeStyle}>
            <Animated.View
              onLayout={(event) => setHeight(event.nativeEvent.layout.height || 1)}
              style={[
                styles.sheet,
                { backgroundColor: colors.slab, paddingBottom: insets.bottom + space.md },
                style,
                innerSize,
                sheetStyle,
              ]}
            >
              <GestureDetector gesture={drag}>
                <View
                  style={styles.grab}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Drag down to close"
                  accessibilityActions={[{ name: 'escape' }]}
                  onAccessibilityAction={onClose}
                >
                  <Animated.View
                    entering={FadeIn}
                    style={[styles.handle, { backgroundColor: colors.textOnSlabMuted }]}
                  />
                </View>
              </GestureDetector>
              {children}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { height: '100%' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.md,
    paddingTop: 0,
    gap: space.md,
  },
  grab: {
    height: GRAB_HEIGHT,
    marginBottom: -space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: HANDLE_WIDTH,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
});
