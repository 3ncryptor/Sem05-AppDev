/**
 * The backend's auth header is the RAW text "Basic name:password", not base64
 * (buildPlan.md 2). This is unusual, so it lives in one tested function.
 * Never log the result.
 */

/**
 * @param {string} name
 * @param {string} password
 * @returns {string}
 */
export function buildAuthHeader(name, password) {
  return `Basic ${name}:${password}`;
}

/**
 * Usernames with a colon or surrounding spaces would corrupt the header.
 * @param {string} name
 * @returns {string | null} an error message, or null when the name is fine
 */
export function usernameError(name) {
  const text = name ?? '';
  if (!text.trim()) return 'Enter a username.';
  if (text !== text.trim()) return 'Remove the spaces around the username.';
  if (text.includes(':')) return 'Usernames cannot contain ":".';
  return null;
}
