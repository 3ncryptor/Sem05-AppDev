/**
 * islandGestures: what each touch on the island means, per shape and kind of
 * activity (buildPlan.md 14, W3 + W4). Pure functions run on the JS side
 * (gesture ends are handed over with scheduleOnRN); only `project` is a worklet.
 *
 * Sideways on a message marks it read (it slides away); switching between
 * live activities lives on the circles. A flick counts as much as a long
 * drag: the decision uses where the finger was heading, not where it stopped.
 */

/** Horizontal commit point, after projection, in points. */
export const SIDEWAYS_COMMIT = 90;
const VERTICAL_COMMIT = 28;
const VERTICAL_VELOCITY = 400;

const SLIDES_AWAY = { message: 'markRead', failed: 'dismiss', newChat: 'dismiss' };
const DISMISSIBLE = new Set(['message', 'failed', 'newChat', 'connection', 'copied']);
const EXPANDABLE = new Set(['message', 'failed', 'newChat']);
const TAPS = {
  message: 'open',
  newChat: 'open',
  failed: 'retry',
  upload: 'open',
  connection: 'network',
  copied: 'dismiss',
};

/**
 * Where a flick would come to rest (Apple's deceleration projection).
 * @param {number} velocity points per second
 * @param {number} [rate] deceleration rate per millisecond
 */
export function project(velocity, rate = 0.998) {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}

/**
 * @param {string} presentation from presentationFor
 * @param {string | null} kind the main activity's kind
 * @param {{ tx: number, ty: number, vx: number, vy: number }} move translation and velocity
 * @returns {'markRead' | 'dismiss' | 'collapse' | 'expand' | 'glance' | 'closeGlance' | null}
 */
export function swipeIntent(presentation, kind, { tx, ty, vx, vy }) {
  if (presentation === 'confirm') return null;
  const isUp = ty < -VERTICAL_COMMIT || vy < -VERTICAL_VELOCITY;
  const isDown = ty > VERTICAL_COMMIT || vy > VERTICAL_VELOCITY;
  const isSideways = Math.abs(tx) > Math.abs(ty) && Math.abs(tx + project(vx)) > SIDEWAYS_COMMIT;

  if (presentation === 'glance') return isUp ? 'closeGlance' : null;
  if (presentation === 'rest') return isDown ? 'glance' : null;
  if (isSideways) return SLIDES_AWAY[kind] ?? null;
  if (presentation === 'expanded') return isUp ? 'collapse' : null;
  if (isUp) return DISMISSIBLE.has(kind) ? 'dismiss' : null;
  if (isDown) return EXPANDABLE.has(kind) ? 'expand' : null;
  return null;
}

/**
 * @param {string} presentation
 * @param {string | null} kind
 * @returns {'glance' | 'skip' | 'open' | 'retry' | 'network' | 'dismiss' | null}
 */
export function tapIntent(presentation, kind) {
  if (presentation === 'rest') return 'glance';
  if (presentation === 'confirm') return 'skip';
  if (presentation === 'expanded' || presentation === 'glance') return null;
  return TAPS[kind] ?? null;
}

/**
 * Can the main activity slide sideways (used to let the content follow the finger)?
 * @param {string | null} kind
 */
export function canSlideAway(kind) {
  return kind === 'message' || kind === 'failed' || kind === 'newChat';
}
