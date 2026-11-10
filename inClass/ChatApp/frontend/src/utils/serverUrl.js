/**
 * Server address helpers (buildPlan.md 3.2). Pure functions, so they are
 * easy to test; reading Expo's hostUri happens in api/baseUrl.js.
 *
 * React Native's URL class is incomplete, so addresses are parsed with a
 * small regex instead.
 */
import { BACKEND_PORT } from '../constants/config';

// scheme? host (name, IPv4 or [IPv6]) :port? /path?
const ADDRESS = /^(?:(https?):\/\/)?(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::(\d{1,5}))?(\/.*)?$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const MAX_PORT = 65535;

/**
 * The backend on the computer running Metro, from Expo's hostUri
 * ("192.168.1.5:8081" -> "http://192.168.1.5:3000").
 * Returns null for tunnel hosts (*.exp.direct), which cannot reach port 3000.
 * @param {string | undefined | null} hostUri
 * @param {number} [port]
 * @returns {string | null}
 */
export function lanUrlFromHostUri(hostUri, port = BACKEND_PORT) {
  if (!hostUri) return null;
  const host = hostUri.split('/')[0].split(':')[0];
  const isLocal = host === 'localhost' || IPV4.test(host);
  return isLocal ? `http://${host}:${port}` : null;
}

/**
 * Cleans up an address typed by the user: adds http:// and the default port
 * when missing and removes trailing slashes.
 * @param {string} input e.g. "10.7.1.51", "http://10.7.1.51:3000/"
 * @returns {{ url: string } | { error: string }}
 */
export function normalizeServerUrl(input) {
  const text = (input ?? '').trim();
  if (!text) return { error: 'Enter the server address.' };

  const match = ADDRESS.exec(text);
  if (!match) return { error: 'That does not look like a server address.' };

  const [, scheme = 'http', host, portText, path = ''] = match;
  const port = portText ? Number(portText) : BACKEND_PORT;
  if (port < 1 || port > MAX_PORT) return { error: 'The port must be between 1 and 65535.' };

  const cleanPath = path.replace(/\/+$/, '');
  return { url: `${scheme.toLowerCase()}://${host.toLowerCase()}:${port}${cleanPath}` };
}

/**
 * Joins a base URL and a path with exactly one slash between them.
 * @param {string} base
 * @param {string} path
 */
export function joinUrl(base, path) {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
