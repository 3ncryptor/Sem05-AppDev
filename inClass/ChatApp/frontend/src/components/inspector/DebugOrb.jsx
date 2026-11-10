/**
 * DebugOrb: a small floating gradient button that opens the Inspector
 * (buildPlan.md D7). Drag it anywhere; on release it springs to the nearer
 * side. The badge counts errors logged since the Inspector was last open.
 * Hidden by Profile > show debug orb.
 */
import Activity from 'lucide-react-native/icons/activity';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EASE_IN_OUT, springs } from '../../constants/motion';
import { space } from '../../constants/theme';
import { unseenErrorCount } from '../../debug/filterLogs';
import { inspectorStore, openInspector } from '../../debug/inspectorStore';
import { logStore } from '../../debug/logStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { clampOrbY, snapOrbX } from '../../utils/orb';
import { Badge } from '../ui/Badge';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';

const SIZE = 48;
const MARGIN = space.sm;
/** Start a little above the middle so it clears the tab bar and the composer. */
const START_Y_RATIO = 0.42;
/** The orb glides up into the header notch, then the notch grows into the Inspector. */
const FLY = { duration: 300, easing: EASE_IN_OUT };
const FLY_SCALE = 0.35;

function openFromOrb() {
  openInspector('orb');
}

/** Where the user left the orb; it unmounts while the Inspector is open and comes back here. */
const lastSpot = { x: null, y: null };

function rememberSpot(x, y) {
  lastSpot.x = x;
  lastSpot.y = y;
}

export function DebugOrb() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const seenLogId = useStore(inspectorStore, (state) => state.seenLogId);
  const errors = useStore(logStore, (state) => unseenErrorCount(state.entries, seenLogId));

  const minY = insets.top + space.xs;
  const maxY = height - insets.bottom - SIZE - space.xs;
  const startX = lastSpot.x ?? width - SIZE - MARGIN;
  const startY = lastSpot.y ?? height * START_Y_RATIO;
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const savedX = useSharedValue(startX);
  const savedY = useSharedValue(startY);
  const flight = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const drag = usePanGesture({
    maxPointers: 1,
    onUpdate: (event) => {
      'worklet';
      x.set(savedX.get() + event.translationX);
      y.set(clampOrbY(savedY.get() + event.translationY, minY, maxY));
    },
    onDeactivate: () => {
      'worklet';
      const snapped = snapOrbX(x.get(), width, SIZE, MARGIN);
      x.set(withSpring(snapped, springs.snap));
      savedX.set(snapped);
      savedY.set(y.get());
      scheduleOnRN(rememberSpot, snapped, y.get());
    },
  });

  const position = useAnimatedStyle(() => ({
    opacity: 1 - flight.get(),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: 1 - (1 - FLY_SCALE) * flight.get() },
    ],
  }));

  function open() {
    haptics.tap();
    if (reduceMotion) {
      openFromOrb();
      return;
    }
    // fly to the top centre (the header notch), shrink and fade, then the notch grows
    x.set(withTiming(width / 2 - SIZE / 2, FLY));
    y.set(withTiming(insets.top, FLY));
    flight.set(
      withTiming(1, FLY, (done) => {
        if (done) scheduleOnRN(openFromOrb);
      }),
    );
  }

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[styles.orb, { shadowColor: colors.shadow }, position]}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={errors ? `Open inspector, ${errors} new errors` : 'Open inspector'}
          hitSlop={8}
        >
          <GradientFill style={styles.disc}>
            <Icon as={Activity} color="#FFFFFF" size={22} />
          </GradientFill>
          <Badge count={errors} ringColor={colors.surface} style={styles.badge} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  disc: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -4, right: -4 },
});
