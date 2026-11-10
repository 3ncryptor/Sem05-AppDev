/**
 * useIslandGestures: the island's touch handling (W3, W4).
 *
 * - Sideways on a message (or a failure / new chat): the content follows the
 *   finger 1:1 and fades with distance; a flick or a long drag slides it away
 *   (mark read / dismiss), otherwise it springs back. One light haptic fires
 *   when the drag crosses the commit point, on the same frame.
 * - Anything else that is dragged rubber-bands, and the pill stretches along
 *   the drag from its velocity (liquid, up to 6%), then relaxes.
 * - Press: a soft squish (a little wider, a little shorter), not a shrink.
 * - Tap / long press / swipe ends are decided on the JS side by the pure
 *   rules in islandGestures, and carried out by islandActions.
 * A new message arrives as the open card, so the card slides too (the first
 * fix only allowed the pill, which is why swiping a fresh notification did
 * nothing). Drags that start on the card's bottom row (reply field, buttons)
 * never slide it, so typing is not disturbed. The glance card does not slide.
 * Every swipe end is logged with its distance, speed and result.
 */
import {
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, EASE_OUT, springs } from '../../constants/motion';
import { runIslandIntent } from '../../island/islandActions';
import {
  canSlideAway,
  project,
  SIDEWAYS_COMMIT,
  swipeIntent,
  tapIntent,
} from '../../island/islandGestures';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';

const PAN_START = [-10, 10];
const LONG_PRESS_MS = 350;
const DRAG_LIMIT = 60;
const SLIDE_OUT = 420;
const MAX_STRETCH = 0.06;
const STRETCH_PER_VELOCITY = 1 / 4000;
/** Bottom strip of the open card (reply field and buttons) that never slides it. */
const ACTIONS_ZONE = 64;

function commitHaptic() {
  haptics.select();
}

function rubberband(offset, limit) {
  'worklet';
  return (offset * limit * 0.55) / (limit + 0.55 * Math.abs(offset));
}

/**
 * @param {object} options
 * @param {string} options.presentation
 * @param {object | null} options.main
 * @param {boolean} options.reduceMotion
 * @param {number} options.shapeHeight current target height (for the card's no-slide strip)
 */
export function useIslandGestures({ presentation, main, reduceMotion, shapeHeight }) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const slide = useSharedValue(0);
  const stretch = useSharedValue(0);
  const press = useSharedValue(0);
  const isPastCommit = useSharedValue(false);
  const startY = useSharedValue(0);

  const isCard = presentation === 'expanded' || presentation === 'glance';
  const isPill = presentation === 'compact' || presentation === 'multi';
  const isOpenCard = presentation === 'expanded';
  const kind = main?.kind ?? null;
  const slides = (isPill || isOpenCard) && canSlideAway(kind);
  const noSlideFrom = isOpenCard ? shapeHeight - ACTIONS_ZONE : Number.POSITIVE_INFINITY;

  function endSwipe(tx, ty, vx, vy, isSlideAllowed) {
    // a sideways drag that began on the card's reply row is the text field's, not ours
    const move = isSlideAllowed ? { tx, ty, vx, vy } : { tx: 0, ty, vx: 0, vy };
    const intent = swipeIntent(presentation, kind, move);
    log.state(
      `island swipe on ${presentation}${kind ? ` (${kind})` : ''}: ` +
        `${Math.round(tx)} pt sideways at ${Math.round(vx)} pt/s, ${Math.round(ty)} pt down ` +
        `-> ${intent ?? 'nothing'}`,
    );
    runIslandIntent(intent, main);
  }

  function endLongPress() {
    if (presentation === 'confirm') return;
    runIslandIntent(main && !isCard ? 'expand' : 'inspector', main);
  }

  function endTap() {
    runIslandIntent(tapIntent(presentation, kind), main);
  }

  const pan = usePanGesture({
    activeOffsetX: presentation === 'glance' ? undefined : PAN_START,
    failOffsetX: presentation === 'glance' ? PAN_START : undefined,
    activeOffsetY: PAN_START,
    onBegin: (event) => {
      'worklet';
      startY.set(event.y);
    },
    onUpdate: (event) => {
      'worklet';
      const isSideways = Math.abs(event.translationX) > Math.abs(event.translationY);
      if (slides && isSideways && startY.get() < noSlideFrom) {
        slide.set(event.translationX);
        // one haptic when the finger crosses the commit point (either way), from the finger only
        const isPast = Math.abs(event.translationX) > SIDEWAYS_COMMIT;
        if (isPast !== isPastCommit.get()) {
          isPastCommit.set(isPast);
          scheduleOnRN(commitHaptic);
        }
        return;
      }
      if (!isCard) dragX.set(rubberband(event.translationX, DRAG_LIMIT));
      dragY.set(rubberband(event.translationY, DRAG_LIMIT / 2));
      if (!reduceMotion) {
        stretch.set(Math.min(MAX_STRETCH, Math.abs(event.velocityX) * STRETCH_PER_VELOCITY));
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const { translationX: tx, translationY: ty, velocityX: vx, velocityY: vy } = event;
      isPastCommit.set(false);
      const isSlideAllowed = startY.get() < noSlideFrom;
      const isGone =
        slides &&
        isSlideAllowed &&
        Math.abs(tx) > Math.abs(ty) &&
        Math.abs(tx + project(vx)) > SIDEWAYS_COMMIT;
      slide.set(
        isGone
          ? withTiming(Math.sign(tx || vx) * SLIDE_OUT, {
              duration: durations.base,
              easing: EASE_OUT,
            })
          : withSpring(0, { ...springs.snap, velocity: vx }),
      );
      dragX.set(withSpring(0, { ...springs.snap, velocity: vx }));
      dragY.set(withSpring(0, { ...springs.snap, velocity: vy }));
      stretch.set(withSpring(0, springs.settle));
      scheduleOnRN(endSwipe, tx, ty, vx, vy, isSlideAllowed);
    },
  });

  const longPress = useLongPressGesture({
    minDuration: LONG_PRESS_MS,
    enabled: !isCard,
    runOnJS: true,
    onActivate: endLongPress,
  });

  const tap = useTapGesture({
    enabled: !isCard,
    onBegin: () => {
      'worklet';
      press.set(withTiming(1, { duration: durations.press, easing: EASE_OUT }));
    },
    onFinalize: () => {
      'worklet';
      press.set(withTiming(0, { duration: durations.fast, easing: EASE_OUT }));
    },
    onActivate: () => {
      'worklet';
      scheduleOnRN(endTap);
    },
  });

  // Pan and long press compete (whichever starts first wins); exclusive would make the
  // long press wait for a still finger's pan to fail, which only happens on lift.
  const panOrHold = useCompetingGestures(pan, longPress);
  const gesture = useExclusiveGestures(panOrHold, tap);
  return { gesture, dragX, dragY, slide, stretch, press };
}
