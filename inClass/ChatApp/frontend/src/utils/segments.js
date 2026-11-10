/**
 * Pure maths for SegmentedPill: where the sliding thumb sits.
 * Kept out of the component so it can be unit-tested.
 */

/**
 * Width of one segment inside a track.
 * @param {number} trackWidth inner width of the track (padding already removed)
 * @param {number} count number of options
 * @returns {number} 0 when the track is not measured yet or there are no options
 */
export function segmentWidth(trackWidth, count) {
  if (!(trackWidth > 0) || !(count > 0)) return 0;
  return trackWidth / count;
}

/**
 * Index of the selected option, falling back to 0 when the value is unknown.
 * @param {{ value: string }[]} options
 * @param {string} value
 */
export function selectedIndex(options, value) {
  const index = options.findIndex((option) => option.value === value);
  return index === -1 ? 0 : index;
}
