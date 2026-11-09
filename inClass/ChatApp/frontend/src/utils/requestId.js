/**
 * Short random ids for the X-Request-Id header. The local backend prints the
 * same id, which links an app log line to its server log line. The backend
 * accepts [A-Za-z0-9_-]{1,64}. Not a security token, so Math.random is fine.
 */

const ID_LENGTH = 6;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** @returns {string} e.g. "a1f3k9" */
export function createRequestId() {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i += 1) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}
