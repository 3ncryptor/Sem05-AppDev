/**
 * islandShapes: the island's five shapes as plain numbers (V7). The shape is
 * a childless, absolutely positioned black view whose width, height and
 * corner radius animate together; content fades in on top of it.
 *
 * Anchor: on Android the resting pill is a small black capsule centred in
 * the status bar, around the front camera hole (most punch-hole phones put it
 * top centre). On iPhones with a Dynamic Island it matches the real one, so
 * the app's island grows out of the hardware.
 *
 *   rest       ( )                    nothing live
 *   compact    (face  ·  2 new)       one activity, content either side
 *   multi      (face 2 new) (o) (o)   main pill + up to two circles
 *   expanded   a card under the camera, full width minus a margin
 *   glance     the card you get by tapping the island at rest (W1)
 *   confirm    a near square with a check
 */

const ANDROID_REST = { width: 76, height: 26 };
const IOS_ISLAND = { width: 126, height: 37 };
const IOS_ISLAND_TOP = 11;
const IOS_ISLAND_MIN_INSET = 59;
const MIN_TOP = 2;
const SIDE_MARGIN = 8;
const COMPACT_EXTRA_HEIGHT = 8;
const COMPACT_WIDTH = 228;
const MULTI_MAIN_WIDTH = 196;
const CIRCLE_GAP = 6;
const EXPANDED_BODY = 150;
const GLANCE_BODY = 128;
const EXPANDED_RADIUS = 36;
const CONFIRM_SIZE = 112;
const CONFIRM_RADIUS = 38;

/**
 * @param {{ os: string, insetTop: number }} device
 * @returns {{ top: number, rest: { width: number, height: number } }}
 */
export function islandAnchor({ os, insetTop }) {
  if (os === 'ios' && insetTop >= IOS_ISLAND_MIN_INSET) {
    return { top: IOS_ISLAND_TOP, rest: IOS_ISLAND };
  }
  const top = Math.max(MIN_TOP, Math.round((insetTop - ANDROID_REST.height) / 2));
  return { top, rest: ANDROID_REST };
}

/**
 * @param {{ main: object | null, circles: object[], expandedKey: string | null,
 *   confirm: object | null }} state
 * @returns {'rest' | 'compact' | 'multi' | 'expanded' | 'glance' | 'confirm'}
 */
export function presentationFor({ main, circles, expandedKey, confirm, glance = false }) {
  if (confirm) return 'confirm';
  if (glance) return 'glance';
  if (!main) return 'rest';
  if (expandedKey && expandedKey === main.key) return 'expanded';
  return circles.length ? 'multi' : 'compact';
}

/**
 * @param {string} presentation
 * @param {{ anchor: ReturnType<typeof islandAnchor>, screenWidth: number }} context
 * @returns {{ width: number, height: number, radius: number }}
 */
export function shapeFor(presentation, { anchor, screenWidth }) {
  const maxWidth = screenWidth - SIDE_MARGIN * 2;
  const compactHeight = anchor.rest.height + COMPACT_EXTRA_HEIGHT;
  const pill = (width, height) => ({
    width: Math.min(width, maxWidth),
    height,
    radius: height / 2,
  });

  switch (presentation) {
    case 'compact':
      return pill(Math.max(COMPACT_WIDTH, anchor.rest.width + 80), compactHeight);
    case 'multi':
      return pill(MULTI_MAIN_WIDTH, compactHeight);
    case 'expanded':
      return {
        width: maxWidth,
        height: anchor.rest.height + EXPANDED_BODY,
        radius: EXPANDED_RADIUS,
      };
    case 'glance':
      return { width: maxWidth, height: anchor.rest.height + GLANCE_BODY, radius: EXPANDED_RADIUS };
    case 'confirm':
      return { width: CONFIRM_SIZE, height: CONFIRM_SIZE + 8, radius: CONFIRM_RADIUS };
    default:
      return pill(anchor.rest.width, anchor.rest.height);
  }
}

/**
 * Where the circles sit, as x offsets from the screen centre line's left
 * edge of the island group. The group (pill + circles) is centred as one.
 * @param {{ width: number, height: number }} main the multi pill
 * @param {number} count 0-2
 * @returns {{ x: number, size: number }[]} x is relative to the group's left edge
 */
export function circleLayout(main, count) {
  return Array.from({ length: count }, (_, index) => ({
    x: main.width + CIRCLE_GAP + index * (main.height + CIRCLE_GAP),
    size: main.height,
  }));
}

/** Total width of the pill and its circles, for centring the group. */
export function groupWidth(main, count) {
  return main.width + count * (main.height + CIRCLE_GAP);
}
