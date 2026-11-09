/**
 * Pure position rules for the draggable debug orb. Marked as worklets so
 * the drag gesture can call them on the UI thread; Jest calls them as
 * plain functions.
 */

/**
 * Snaps the orb to the nearer side of the screen.
 * @param {number} x current left edge of the orb
 * @param {number} screenWidth
 * @param {number} size orb diameter
 * @param {number} margin gap to the screen edge
 * @returns {number} the new left edge
 */
export function snapOrbX(x, screenWidth, size, margin) {
  'worklet';
  const isLeft = x + size / 2 < screenWidth / 2;
  return isLeft ? margin : screenWidth - size - margin;
}

/**
 * Keeps the orb between the top and bottom limits.
 * @param {number} y
 * @param {number} min
 * @param {number} max
 */
export function clampOrbY(y, min, max) {
  'worklet';
  return Math.min(Math.max(y, min), max);
}
