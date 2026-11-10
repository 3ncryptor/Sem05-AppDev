/**
 * Text colour for a log level on the dark Inspector sheet.
 */
import { gradient } from '../../constants/theme';

/**
 * @param {'info' | 'warn' | 'error'} level
 * @param {{ textOnSlab: string, dangerOnSlab: string }} colors
 */
export function levelColor(level, colors) {
  if (level === 'error') return colors.dangerOnSlab;
  if (level === 'warn') return gradient.colors[0];
  return colors.textOnSlab;
}
