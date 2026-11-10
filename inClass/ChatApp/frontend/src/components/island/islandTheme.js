/**
 * islandTheme: the island is always black (it is the camera housing), in
 * light and dark mode, so its colours are fixed rather than themed.
 * Text contrast on #000: white 21:1, muted 9.4:1, every tone above 7:1.
 */
import { gradient } from '../../constants/theme';

export const island = {
  fill: '#000000',
  edge: 'rgba(255,255,255,0.07)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.62)',
  raised: '#1C1C1E',
  warn: gradient.colors[0],
  danger: '#EE9489',
  success: '#5FC46F',
  accent: gradient.colors[1],
};

/** @param {'warn' | 'danger' | 'success' | undefined} tone */
export function toneColor(tone) {
  return island[tone] ?? island.text;
}
