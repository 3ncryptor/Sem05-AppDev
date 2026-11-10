/**
 * cleanAvatarSvg: strips the parts of a DiceBear SVG that react-native-svg
 * either can't draw or draws badly (buildPlan.md 13, V0).
 *
 * - `<metadata>` holds licence info in rdf/dc tags. react-native-svg has no
 *   element for them, so they are parsed and thrown away for every face.
 * - DiceBear wraps the whole face in `<mask id="viewboxMask">`, a full-size
 *   white rectangle with square corners: it hides nothing. On Android every
 *   masked group is drawn through three full-canvas offscreen layers and
 *   clipped to bounds mapped back through the viewBox scale, which is where
 *   faces come out cut off or late. Unwrapping it draws the same pixels.
 *
 * The licence (CC0) is recorded in the README, so nothing is lost.
 */

const METADATA = /<metadata[\s\S]*?<\/metadata>/;
const VIEWBOX_MASK = /<mask id="viewboxMask">[\s\S]*?<\/mask><g mask="url\(#viewboxMask\)">/;

/**
 * @param {string} svg DiceBear output
 * @returns {string} the same drawing without metadata or the no-op mask
 */
export function cleanAvatarSvg(svg) {
  return svg.replace(METADATA, '').replace(VIEWBOX_MASK, '<g>');
}
