/**
 * NotchIsland: the live island around the front camera (buildPlan.md 13 V7,
 * 14 W1-W4). Mounted once at the root, above every screen.
 *
 * Shapes: rest, compact, multi (pill + up to two circles), expanded (a card
 * with quick reply), glance (status card from rest), confirm (a square).
 *
 * Motion (calm, liquid, never bouncy):
 * - Width, height and radius move together on one spring; before growing the
 *   pill "inhales" for 90 ms, so an arrival is noticed without any bounce.
 * - Content grows out of the camera point (top centre) after the shape leads.
 * - Circles pull away through a liquid neck and merge back the same way.
 * - Under the finger: a soft squish on press; a stretch along a drag.
 * - A message arrival sends one ring out; at rest it stays still, apart from
 *   one quiet breath when you come back to the app and nothing is new.
 * - Reduce motion: shapes snap, content only fades, no extras.
 *
 * Touch: see islandGestures (rules) and useIslandGestures (handling).
 */
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { KeyboardController } from 'react-native-keyboard-controller';
import Animated, {
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { durations, EASE_OUT } from '../../constants/motion';
import { inspectorStore } from '../../debug/inspectorStore';
import { toolsStore } from '../../debug/toolsStore';
import { useIslandFeeds } from '../../hooks/useIslandFeeds';
import { useStore } from '../../hooks/useStore';
import { runIslandIntent } from '../../island/islandActions';
import { tapIntent } from '../../island/islandGestures';
import { visibleActivities } from '../../island/islandQueue';
import { groupWidth, islandAnchor, presentationFor, shapeFor } from '../../island/islandShapes';
import { islandStore, setAutoExpandGuard } from '../../island/islandStore';
import { IslandBridge } from './IslandBridge';
import { IslandCircle } from './IslandCircle';
import { IslandCompact } from './IslandCompact';
import { IslandConfirm } from './IslandConfirm';
import { IslandExpanded } from './IslandExpanded';
import { IslandGlance } from './IslandGlance';
import { IslandRing } from './IslandRing';
import { island } from './islandTheme';
import { IslandWire } from './IslandWire';
import { useIslandGestures } from './useIslandGestures';
import { useIslandMotion } from './useIslandMotion';

/** Content arrives once the shape is most of the way there, from the camera point. */
const CONTENT_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
})
  .duration(durations.base)
  .delay(150);
const CONTENT_OUT = FadeOut.duration(100);
const CIRCLE_GAP = 6;
const DRAG_ROOM = 60;
/** Press squish: a little wider and shorter, like pressing a drop. */
const SQUISH_X = 0.025;
const SQUISH_Y = 0.05;
const SLIDE_FADE = 160;
/** Just after the old content's exit fade, before the new content arrives. */
const SLIDE_RESET_MS = 120;
/** About the island spring's settle time: how long circles take to merge back. */
const MERGE_MS = 460;

const A11Y_ACTIONS = [
  { name: 'activate' },
  { name: 'longpress', label: 'open the card' },
  { name: 'markRead', label: 'mark as read' },
  { name: 'dismiss', label: 'dismiss' },
];

function accessibilityLabel(presentation, main) {
  if (presentation === 'rest') {
    return 'Island. Double tap for a status glance, hold for the Inspector.';
  }
  if (!main) return 'Island';
  return `${main.title}${main.detail ? `, ${main.detail}` : ''}. Double tap to open.`;
}

export function NotchIsland() {
  useIslandFeeds();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const state = useStore(islandStore);
  const isInspectorOpen = useStore(inspectorStore, (s) => s.isOpen);
  const showWire = useStore(toolsStore, (s) => s.islandWire);

  useEffect(() => {
    setAutoExpandGuard(() => !KeyboardController.isVisible() && !inspectorStore.get().isOpen);
  }, []);

  const anchor = islandAnchor({ os: Platform.OS, insetTop: insets.top });
  const { main, circles } = visibleActivities(state.activities, state.primaryKey);
  const presentation = presentationFor({ main, circles, ...state });
  const shape = shapeFor(presentation, { anchor, screenWidth });
  const circleSize = shapeFor('multi', { anchor, screenWidth }).height;
  const circleCount = presentation === 'multi' ? circles.length : 0;
  const left = (screenWidth - groupWidth(shape, circleCount)) / 2;
  const motion = useIslandMotion(
    { ...shape, left, split: circleCount ? 1 : 0 },
    reduceMotion,
    state.breathId,
  );
  const touch = useIslandGestures({
    presentation,
    main,
    reduceMotion,
    shapeHeight: shape.height,
  });
  const contentKey = `${presentation}:${main?.key ?? ''}:${state.confirm?.id ?? ''}`;

  // A new main activity starts centred, not where the last one slid away to. Reset only
  // after the old content's 100 ms exit, or it would flash back to the middle.
  useEffect(() => {
    const timer = setTimeout(() => touch.slide.set(0), SLIDE_RESET_MS);
    return () => clearTimeout(timer);
  }, [contentKey, touch.slide]);

  // The Inspector unmounts the island mid-gesture: never come back squished or offset.
  useEffect(() => {
    [touch.press, touch.dragX, touch.dragY, touch.stretch, touch.slide].forEach((value) =>
      value.set(0),
    );
  }, [isInspectorOpen, touch.press, touch.dragX, touch.dragY, touch.stretch, touch.slide]);

  // Circles stay mounted while they merge back into the pill, then leave. The last set is
  // remembered during render (React's "previous value" pattern), cleared by a timer.
  const circleKeys = circleCount ? circles.map((item) => item.key).join(',') : '';
  const [lastCircles, setLastCircles] = useState({ keys: '', list: [] });
  if (circleKeys && circleKeys !== lastCircles.keys) {
    setLastCircles({ keys: circleKeys, list: circles });
  }
  const isMerging = !circleKeys && lastCircles.list.length > 0;
  useEffect(() => {
    if (!isMerging) return undefined;
    const timer = setTimeout(() => setLastCircles({ keys: '', list: [] }), MERGE_MS);
    return () => clearTimeout(timer);
  }, [isMerging]);
  const shownCircles = circleKeys ? circles : lastCircles.list;

  const shapeStyle = useAnimatedStyle(() => {
    const p = touch.press.get();
    const stretch = touch.stretch.get();
    return {
      width: motion.w.get(),
      height: motion.h.get(),
      borderRadius: motion.r.get(),
      transform: [
        { translateX: motion.left.get() + touch.dragX.get() },
        { translateY: touch.dragY.get() },
        { scaleX: motion.sx.get() * (1 + SQUISH_X * p) * (1 + stretch) },
        { scaleY: motion.sy.get() * (1 - SQUISH_Y * p) * (1 - stretch / 2) },
      ],
    };
  });

  const slideStyle = useAnimatedStyle(() => {
    const distance = Math.abs(touch.slide.get());
    return {
      opacity: Math.max(0, 1 - distance / SLIDE_FADE),
      transform: [{ translateX: touch.slide.get() }],
    };
  });

  const rimStyle = useAnimatedStyle(() => ({ opacity: motion.rim.get() }));

  if (isInspectorOpen) return null;

  const layerHeight = shapeFor('expanded', { anchor, screenWidth }).height + DRAG_ROOM;
  const compact = shapeFor('compact', { anchor, screenWidth });

  function onAccessibilityAction(event) {
    const name = event.nativeEvent.actionName;
    if (name === 'activate') runIslandIntent(tapIntent(presentation, main?.kind ?? null), main);
    else if (name === 'longpress') runIslandIntent(main ? 'expand' : 'inspector', main);
    else if (name === 'markRead' && main?.kind === 'message') runIslandIntent('markRead', main);
    else if (name === 'dismiss' && main) runIslandIntent('dismiss', main);
  }

  return (
    // The layer spans the tallest shape: Android only delivers touches inside a parent's bounds.
    <View pointerEvents="box-none" style={[styles.layer, { top: anchor.top, height: layerHeight }]}>
      {reduceMotion ? null : (
        <IslandRing
          arrivalId={state.arrivalId}
          shape={compact}
          left={(screenWidth - compact.width) / 2}
        />
      )}
      {shownCircles.length && !reduceMotion ? (
        <IslandBridge size={circleSize} gap={CIRCLE_GAP} motion={motion} dragX={touch.dragX} />
      ) : null}
      {shownCircles.length
        ? shownCircles.map((activity, index) => (
            <IslandCircle
              key={activity.key}
              activity={activity}
              index={index}
              size={circleSize}
              gap={CIRCLE_GAP}
              motion={motion}
              dragX={touch.dragX}
            />
          ))
        : null}
      <GestureDetector gesture={touch.gesture}>
        <Animated.View
          style={[styles.shape, shapeStyle]}
          accessible={presentation !== 'expanded' && presentation !== 'glance'}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel(presentation, main)}
          accessibilityActions={A11Y_ACTIONS}
          onAccessibilityAction={onAccessibilityAction}
        >
          <Animated.View pointerEvents="none" style={[styles.rim, rimStyle]} />
          <Animated.View style={[styles.fill, slideStyle]} pointerEvents="box-none">
            <Animated.View
              key={contentKey}
              entering={reduceMotion ? undefined : CONTENT_IN}
              exiting={CONTENT_OUT}
              style={[
                styles.content,
                { width: shape.width, height: shape.height, marginLeft: -shape.width / 2 },
              ]}
              pointerEvents="box-none"
            >
              {renderContent({ presentation, main, state, anchor, shape })}
            </Animated.View>
          </Animated.View>
          {showWire ? <IslandWire width={motion.w} /> : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function renderContent({ presentation, main, state, anchor, shape }) {
  const topGap = anchor.rest.height + 4;
  switch (presentation) {
    case 'confirm':
      return <IslandConfirm confirm={state.confirm} topGap={anchor.rest.height * 0.4} />;
    case 'glance':
      return <IslandGlance topGap={topGap} />;
    case 'expanded':
      return (
        <IslandExpanded
          activity={main}
          topGap={topGap}
          onAction={(intent) => runIslandIntent(intent, main)}
        />
      );
    case 'compact':
    case 'multi':
      return (
        <IslandCompact activity={main} cameraGap={anchor.rest.width * 0.6} height={shape.height} />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, zIndex: 1000, elevation: 1000 },
  shape: {
    position: 'absolute',
    top: 0,
    left: 0,
    // squish, inhale and breath scale from the camera edge, so the top never detaches
    transformOrigin: 'top',
    backgroundColor: island.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: island.edge,
    overflow: 'hidden',
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: island.accent,
  },
  fill: { ...StyleSheet.absoluteFillObject },
  // content scales out of the camera point, not the middle
  content: { position: 'absolute', top: 0, left: '50%', transformOrigin: 'top' },
});
