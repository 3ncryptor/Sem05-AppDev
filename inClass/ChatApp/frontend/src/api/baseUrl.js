/**
 * baseUrl: which backend to talk to (buildPlan.md 3.2).
 * - "lan": the backend on the computer running Metro, worked out from Expo's
 *   hostUri every launch (the laptop's Wi-Fi address can change).
 * - "custom": an address typed in, such as the class server.
 */
import Constants from 'expo-constants';
import { lanUrlFromHostUri, normalizeServerUrl } from '../utils/serverUrl';

/** The laptop's backend URL, or null when it cannot be worked out (tunnel mode, release build). */
export function lanBaseUrl() {
  return lanUrlFromHostUri(Constants.expoConfig?.hostUri);
}

/**
 * @param {'lan' | 'custom'} serverMode
 * @param {string} customUrl
 * @returns {string | null}
 */
export function resolveBaseUrl(serverMode, customUrl) {
  if (serverMode === 'lan') return lanBaseUrl();
  const result = normalizeServerUrl(customUrl);
  return 'url' in result ? result.url : null;
}
