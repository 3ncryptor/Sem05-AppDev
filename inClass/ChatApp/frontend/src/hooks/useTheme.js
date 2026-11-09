/**
 * useTheme: the colour set for the current appearance.
 * Follows the phone's light/dark setting. The Profile override (settingsStore)
 * calls Appearance.setColorScheme, so useColorScheme already reflects it.
 */
import { useColorScheme } from 'react-native';
import { themes } from '../constants/theme';

/**
 * @returns {{ colors: typeof themes.light, scheme: 'light' | 'dark', isDark: boolean }}
 */
export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: themes[scheme], scheme, isDark: scheme === 'dark' };
}
