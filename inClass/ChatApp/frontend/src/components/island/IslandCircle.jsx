/**
 * IslandCircle: one split-off live activity beside the pill (iPhone 18 Pro
 * style, up to two). Tap brings it into the main pill; swipe sideways across
 * the circles switches to the next one (the pill's own sideways swipe marks a
 * message read). It rides on the pill's live width, at a fixed size.
 */
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  useTapGesture,
  useExclusiveGestures,
} from 'react-native-gesture-handler';
import Animated, { FadeOut, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { cycleIsland, promoteActivity } from '../../island/islandStore';
import { haptics } from '../../utils/haptics';
import { IslandGlyph } from './IslandGlyph';
import { island } from './islandTheme';

const CIRCLE_OUT = FadeOut.duration(120);
const SWIPE = 24;

function bringForward(key) {
  haptics.select();
  promoteActivity(key);
}

function switchBy(direction) {
  haptics.select();
  cycleIsland(direction);
}

/**
 * @param {object} props
 * @param {object} props.activity
 * @param {number} props.index 0 or 1
 * @param {number} props.size
 * @param {number} props.gap
 * @param {object} props.motion shared values from useIslandMotion
 * @param {object} props.dragX
 */
export function IslandCircle({ activity, index, size, gap, motion, dragX }) {
  const style = useAnimatedStyle(() => {
    const offset = motion.w.get() + gap + index * (size + gap);
    const tuck = (1 - motion.split.get()) * (gap + size * (index + 1));
    return {
      opacity: motion.split.get(),
      transform: [
        { translateX: motion.left.get() + offset - tuck + dragX.get() * 0.6 },
        { scale: 0.7 + 0.3 * motion.split.get() },
      ],
    };
  });

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      scheduleOnRN(bringForward, activity.key);
    },
  });
  const swipe = usePanGesture({
    activeOffsetX: [-10, 10],
    onDeactivate: (event) => {
      'worklet';
      if (Math.abs(event.translationX) > SWIPE) {
        scheduleOnRN(switchBy, event.translationX < 0 ? 1 : -1);
      }
    },
  });
  const gesture = useExclusiveGestures(swipe, tap);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        exiting={CIRCLE_OUT}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${activity.title}. Bring to the front`}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => bringForward(activity.key)}
      >
        <View style={styles.inner}>
          <IslandGlyph activity={activity} size={20} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: island.fill,
    overflow: 'hidden',
  },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
