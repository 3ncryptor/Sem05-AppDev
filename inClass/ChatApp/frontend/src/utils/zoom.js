/**
 * Zoom and dismiss rules for the image viewer. Marked as worklets so the
 * gesture callbacks can call them on the UI thread; they are plain
 * functions in tests.
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

/** @param {number} scale */
export function clampScale(scale) {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Swiping down far or fast enough (while not zoomed in) closes the viewer.
 * @param {number} translationY
 * @param {number} velocityY
 */
export function shouldDismiss(translationY, velocityY) {
  'worklet';
  return translationY > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY;
}

/** Double tap zooms in, or back out when already zoomed. @param {number} scale */
export function nextDoubleTapScale(scale) {
  'worklet';
  return scale > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;
}
