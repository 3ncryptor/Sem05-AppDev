/**
 * Motion tokens (design.md section 8, retuned in buildPlan.md 13 V1).
 *
 * The rule: calm and quick. Springs use Reanimated's `duration` +
 * `dampingRatio` form (Apple's two designer parameters). A ratio of 1 never
 * overshoots; nothing here goes below 0.85, so motion settles instead of
 * bouncing. Springs are kept for things a finger moves or that should feel
 * alive (the island); everything else uses a timing curve. Durations in ms.
 */
import { Easing, Keyframe } from 'react-native-reanimated';

/** Strong ease-out for anything entering or responding. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Ease-in-out for something moving across the screen. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/** The iOS sheet curve. */
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

export const springs = {
  /** Settles with no overshoot: snapping back, resetting a zoom. */
  settle: { duration: 400, dampingRatio: 1 },
  /** After a drag lets go: a hint of give, carries the finger's velocity. */
  snap: { duration: 400, dampingRatio: 0.9 },
  /** The island's shape: alive but quiet (buildPlan.md 13 V7). */
  island: { duration: 460, dampingRatio: 0.86 },
};

export const durations = {
  press: 120,
  fast: 160,
  base: 220,
  indicator: 250,
  messageIn: 220,
  sheet: 300,
  shake: 280,
  imageFade: 200,
};

/** Delay between rows when a short list fades in one after another. */
export const STAGGER_MS = 40;

/** How far a pressed control shrinks: felt more than seen. */
export const PRESS_SCALE = 0.97;

/** Horizontal distance of the error shake, in points. */
export const SHAKE_DISTANCE = 5;

/** Entrances start here, never from nothing. */
export const ENTER_SCALE = 0.96;

/** Rise distance for content that fades up into place. */
export const RISE_DISTANCE = 8;

/**
 * Fade plus a slight grow from 0.96: replaces the old bouncy ZoomIn.springify().
 * Build at module scope or in useMemo; never inline in JSX.
 * @param {number} [duration]
 */
export function softPop(duration = durations.base) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: ENTER_SCALE }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
  }).duration(duration);
}

/**
 * Fade up a few points: for rows, sections and banners.
 * @param {number} [delay]
 * @param {number} [duration]
 */
export function riseIn(delay = 0, duration = durations.base) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: RISE_DISTANCE }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .duration(duration)
    .delay(delay);
}

/**
 * Fade out with a slight shrink, about 20% quicker than the way in.
 * @param {number} [duration]
 */
export function softOut(duration = durations.fast) {
  return new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: ENTER_SCALE }], easing: EASE_OUT },
  }).duration(duration);
}
