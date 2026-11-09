/**
 * App-wide settings that are not design tokens: timings, limits and the
 * default backend port. Change behaviour here, never with numbers inline.
 */

/** Port the ChatApp backend listens on (Docker publishes 3000:3000). */
export const BACKEND_PORT = 3000;

/** Give up on a request after this long and show a network error. */
export const REQUEST_TIMEOUT_MS = 10000;

/** Polling intervals (the backend has no push). */
export const POLL_MS = {
  conversations: 5000,
  messages: 3000,
  serverLogs: 2000,
};

/** The backend returns messages in pages of 20. */
export const PAGE_SIZE = 20;

/** Image picker quality: keeps photos well under the backend's 10 MB cap. */
export const IMAGE_QUALITY = 0.5;

/** How many log lines the in-app Inspector keeps. */
export const MAX_LOG_ENTRIES = 500;
