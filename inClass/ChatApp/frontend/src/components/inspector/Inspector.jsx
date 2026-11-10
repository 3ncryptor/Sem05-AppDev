/**
 * Inspector: the in-app debug console (buildPlan.md 15). It grows down out of
 * the header notch of whatever screen is showing, to the bottom of the
 * screen, covering the page completely; closing shrinks it back into the
 * header. A root overlay (not a Modal), mounted once in the root layout.
 *
 * Motion: the panel's height moves on a no-overshoot spring; the page behind
 * dims as it grows; the header text fades in once the panel has room; the tab
 * content (lists, the flow diagram) mounts only after the panel has landed, so
 * the growth never has to lay out a long list on every frame.
 *
 * Close: swipe up on the top strip (it follows the finger), Android back, (x).
 * Tabs at the bottom: overview, flow, network, logs, tools.
 */
import X from 'lucide-react-native/icons/x';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { fonts, radius, space, type } from '../../constants/theme';
import { lastFinished, summarizeConnection } from '../../debug/connectionSummary';
import { closeInspector, inspectorStore, setInspectorTab } from '../../debug/inspectorStore';
import { networkStore } from '../../debug/networkStore';
import { checkServerLogs } from '../../debug/serverLogStore';
import { useServerLogs } from '../../hooks/useServerLogs';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { project } from '../../island/islandGestures';
import { measureVisibleNotch, notchStore } from '../../store/notchStore';
import { sessionStore } from '../../store/sessionStore';
import { RingButton } from '../ui/RingButton';
import { KeyboardSpacer } from '../ui/KeyboardSpacer';
import { FlowPanel } from './FlowPanel';
import { InspectorTabBar } from './InspectorTabBar';
import { LogsPanel } from './LogsPanel';
import { NetworkPanel } from './NetworkPanel';
import { OverviewPanel } from './OverviewPanel';
import { ToolsPanel } from './ToolsPanel';

const GROW = { duration: 460, dampingRatio: 1 };
const SHRINK = { duration: 360, easing: EASE_IN_OUT };
const SCRIM_OPACITY = 0.55;
const CLOSE_DRAG = 120;
/** Extra wait after the growth before the safety net shows the content anyway. */
const LAND_GRACE_MS = 400;
const BODY_IN = FadeIn.duration(durations.base);

function TabBody({ tab, server }) {
  if (tab === 'network') return <NetworkPanel serverEntries={server.entries} />;
  if (tab === 'flow') return <FlowPanel server={server} />;
  if (tab === 'tools') return <ToolsPanel server={server} onRetryServer={checkServerLogs} />;
  if (tab === 'logs') return <LogsPanel server={server} onRetryServer={checkServerLogs} />;
  return <OverviewPanel server={server} />;
}

export function Inspector() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // The panel fills the overlay it lives in, measured: the physical screen height can be
  // taller than the app's root view, which pushed the tab bar off the bottom of the screen.
  const { height: windowHeight } = useWindowDimensions();
  const [rootHeight, setRootHeight] = useState(0);
  const screenHeight = rootHeight || windowHeight;
  const reduceMotion = useReducedMotion();
  const { isOpen, tab } = useStore(inspectorStore);
  const notchHeight = useStore(notchStore, (state) => state.height);
  const server = useServerLogs(isOpen);
  const baseUrl = useStore(sessionStore, (state) => state.baseUrl);
  const requests = useStore(networkStore, (state) => state.requests);

  // mounted while open or while shrinking away
  const [isMounted, setIsMounted] = useState(isOpen);
  if (isOpen && !isMounted) setIsMounted(true);
  // every opening gets a number; content shows only once THIS opening has landed
  const [openCount, setOpenCount] = useState(0);
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    if (isOpen) setOpenCount(openCount + 1);
  }
  const [landedFor, setLandedFor] = useState(-1);
  const showContent = isOpen && landedFor === openCount; // heavy content never rides a resize

  const height = useSharedValue(notchHeight);
  const from = useSharedValue(notchHeight); // the notch it grew out of (and shrinks back to)
  const isShrinking = useRef(false); // animation-only: reopening mid-shrink must not jump

  function finishClosing() {
    isShrinking.current = false;
    setIsMounted(false);
  }

  useEffect(() => {
    if (!isMounted) return undefined;
    if (!isOpen) {
      isShrinking.current = true;
      height.set(
        withTiming(from.get(), reduceMotion ? { duration: 0 } : SHRINK, (done) => {
          if (done) scheduleOnRN(finishClosing);
        }),
      );
      return undefined;
    }
    const opening = openCount;
    const land = (done) => {
      'worklet';
      if (done) scheduleOnRN(setLandedFor, opening);
    };
    const grow = () =>
      height.set(
        reduceMotion
          ? withTiming(screenHeight, { duration: 0 }, land)
          : withSpring(screenHeight, GROW, land),
      );
    // Safety net: content and tabs appear even if the animation's "done" never arrives.
    const fallback = setTimeout(() => setLandedFor(opening), GROW.duration + LAND_GRACE_MS);
    if (isShrinking.current) {
      isShrinking.current = false; // carry on from where the shrink is
      grow();
      return () => clearTimeout(fallback);
    }
    let isCancelled = false;
    measureVisibleNotch().then((measured) => {
      if (isCancelled) return;
      const start = measured ?? notchHeight;
      from.set(start);
      height.set(start);
      grow();
    });
    return () => {
      isCancelled = true;
      clearTimeout(fallback);
    };
    // notchHeight / screenHeight are read at the moment of opening or closing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMounted, openCount]);

  // If the overlay's size changes while open (first measure, rotation), fill it again.
  useEffect(() => {
    if (showContent) height.set(screenHeight);
  }, [showContent, screenHeight, height]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeInspector();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen]);

  const swipeUp = usePanGesture({
    enabled: showContent, // not while growing, or the growth would never land
    activeOffsetY: [-10, 10],
    onUpdate: (event) => {
      'worklet';
      height.set(screenHeight + Math.min(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.translationY + project(event.velocityY) < -CLOSE_DRAG) {
        scheduleOnRN(closeInspector);
      } else {
        height.set(withSpring(screenHeight, { ...GROW, velocity: event.velocityY }));
      }
    },
  });

  const panelStyle = useAnimatedStyle(() => {
    // rounded like the notch while small, square once it fills the screen
    const corner = interpolate(
      height.get(),
      [screenHeight - 120, screenHeight],
      [radius.slab, 0],
      Extrapolation.CLAMP,
    );
    return {
      height: height.get(),
      borderBottomLeftRadius: corner,
      borderBottomRightRadius: corner,
    };
  });
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      height.get(),
      [from.get(), screenHeight],
      [0, SCRIM_OPACITY],
      Extrapolation.CLAMP,
    ),
  }));
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(height.get(), [from.get(), from.get() + 120], [0, 1], Extrapolation.CLAMP),
  }));

  if (!isMounted) return null;

  const connection = summarizeConnection(baseUrl, lastFinished(requests));
  const toneColor = {
    ok: colors.success,
    bad: colors.dangerOnSlab,
    idle: colors.textOnSlabMuted,
  }[connection.tone];
  const problems = requests.filter((row) => row.state === 'error').length;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(event) => setRootHeight(event.nativeEvent.layout.height)}
    >
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      <Animated.View
        style={[styles.panel, { backgroundColor: colors.slab }, panelStyle]}
        accessibilityViewIsModal
      >
        <GestureDetector gesture={swipeUp}>
          <Animated.View
            style={[styles.header, { paddingTop: insets.top + space.xs }, headerStyle]}
          >
            <View style={styles.grabber}>
              <View style={[styles.handle, { backgroundColor: colors.textOnSlabMuted }]} />
            </View>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text style={[type.title, { color: colors.textOnSlab }]} accessibilityRole="header">
                  inspector
                </Text>
                <View style={styles.status}>
                  <View style={[styles.dot, { backgroundColor: toneColor }]} />
                  <Text
                    style={[styles.statusText, { color: colors.textOnSlabMuted }]}
                    numberOfLines={1}
                  >
                    {connection.text}
                  </Text>
                </View>
              </View>
              <RingButton
                icon={X}
                variant="slab"
                size={40}
                onPress={closeInspector}
                accessibilityLabel="Close inspector"
              />
            </View>
          </Animated.View>
        </GestureDetector>
        <View style={styles.body}>
          {showContent ? (
            <Animated.View key={tab} entering={BODY_IN} style={styles.fill}>
              <TabBody tab={tab} server={server} />
            </Animated.View>
          ) : null}
        </View>
        {showContent ? (
          <Animated.View entering={BODY_IN}>
            <InspectorTabBar tab={tab} onChange={setInspectorTab} problems={problems} />
          </Animated.View>
        ) : null}
        <KeyboardSpacer restingHeight={insets.bottom + space.sm} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 2000,
    elevation: 2000,
  },
  header: { paddingHorizontal: space.md, paddingBottom: space.sm },
  grabber: { alignItems: 'center', paddingBottom: space.xs },
  handle: { width: 40, height: 4, borderRadius: 2, opacity: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleText: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  body: { flex: 1, paddingHorizontal: space.md },
  fill: { flex: 1 },
});
