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

/** How many requests the Inspector's Network tab keeps. */
export const MAX_NETWORK_ENTRIES = 200;

/** Long strings in logged request bodies (base64 images) are cut to "<N chars>" past this. */
export const LOG_STRING_LIMIT = 120;

/**
 * Polling requests fire every few seconds; printing each one would bury the
 * Metro terminal. They always reach the Inspector; set true to print them too.
 * Failed polls are always printed.
 */
export const LOG_POLLS_TO_CONSOLE = false;

/** How long the login button shows its check mark before the app moves on. */
export const LOGIN_SUCCESS_HOLD_MS = 650;

/** How long the "back online" banner stays before it hides. */
export const RESTORED_BANNER_MS = 2000;

/** The backend rejects files over 10 MB (decoded size). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Decoded images kept in memory; each is a large base64 string, so keep it small. */
export const MAX_IMAGE_CACHE = 40;

/** Server log lines fetched when the Inspector first connects (older ones are skipped). */
export const SERVER_LOG_BACKLOG = 100;

/** Most server log lines asked for in one poll. */
export const SERVER_LOG_PAGE = 200;

/** Server log lines the Inspector keeps. */
export const MAX_SERVER_LOG_ENTRIES = 500;

/** Lines included in the copied debug report. */
export const DEBUG_REPORT_LINES = 100;

/** Shake to open: how hard (in g, beyond gravity), how many jolts, within what window. */
export const SHAKE = { threshold: 1.4, hits: 3, windowMs: 900, cooldownMs: 1500, sampleMs: 80 };

/** Poll interval choices offered in Inspector > tools. */
export const POLL_CHOICES = {
  conversations: [2000, 5000, 10000],
  messages: [1000, 3000, 6000],
};

/** Longest response preview kept per request in the Network tab. */
export const MAX_PREVIEW_CHARS = 1500;

/** How long a "copied" check mark stays before the button resets. */
export const COPIED_HOLD_MS = 1500;
