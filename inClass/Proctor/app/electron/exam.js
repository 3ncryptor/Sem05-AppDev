// Holds the attempt this window may enter (BUILD_PLAN §17.4).
// Phase 2 only remembers attempt ids returned by attempts.start / attempts.get, so `exam:enter`
// (Phase 3) can refuse ids the server never gave us. Fullscreen, detectors, capture and the
// heartbeat are started from here in Phases 3–5.

/** Attempt ids the server returned to this session. */
const knownAttemptIds = new Set()

/** @type {string | null} the attempt currently running in fullscreen, if any */
let activeAttemptId = null

/** Called by api.js after attempts.start / attempts.get succeed. Accepts `{ attempt: { id } }` or `{ id }`. */
export function rememberAttempt(data) {
  const id = data?.attempt?.id ?? data?.id
  if (typeof id === 'string') knownAttemptIds.add(id)
}

export const isKnownAttempt = (id) => knownAttemptIds.has(id)
export const getActiveAttemptId = () => activeAttemptId

/** Phase 3 sets this from `exam:enter`; Phase 4 clears it on submit. */
export function setActiveAttemptId(id) {
  activeAttemptId = id
}
