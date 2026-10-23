// The renderer's only door to the outside (BUILD_PLAN §16). Wraps window.athena, unwraps the
// `{ ok, data, error }` envelope, and throws ApiError on failure. No fetch, no Node, no Electron here.

export class ApiError extends Error {
  /** @param {{ code?: string, message?: string, fields?: Record<string, string> }} [error] */
  constructor(error = {}) {
    super(error.message ?? 'Something went wrong.')
    this.name = 'ApiError'
    this.code = error.code ?? 'IPC_REJECTED'
    this.fields = error.fields ?? null
  }
}

/** True when running inside Athena's window (the preload exposed window.athena). */
export const hasBridge = () => typeof window !== 'undefined' && Boolean(window.athena)

/**
 * Awaits an IPC call and returns its `data`, or throws ApiError.
 * A rejected invoke (e.g. a channel that a later phase registers) also becomes ApiError.
 * @template T @param {() => Promise<{ ok: boolean, data: T, error: any }>} call @returns {Promise<T>}
 */
async function unwrap(call) {
  if (!hasBridge()) throw new ApiError({ code: 'IPC_REJECTED', message: 'Open Athena from the app, not a browser.' })
  let envelope
  try {
    envelope = await call()
  } catch {
    throw new ApiError({ code: 'IPC_REJECTED', message: 'Athena could not complete that request.' })
  }
  if (envelope?.ok) return envelope.data
  throw new ApiError(envelope?.error)
}

/** Calls a named server route from BUILD_PLAN §18, e.g. `api('exams.list')`. */
export const api = (name, params = {}) => unwrap(() => window.athena.api(name, params))

/** Local (non-HTTP) IPC calls, one function per channel. */
export const ipc = {
  login: (rollNo, password) => unwrap(() => window.athena.auth.login({ rollNo, password })),
  logout: () => unwrap(() => window.athena.auth.logout()),
  me: () => unwrap(() => window.athena.auth.me()),
  serverGet: () => unwrap(() => window.athena.server.get()),
  serverSet: (url) => unwrap(() => window.athena.server.set({ url })),
  serverPing: () => unwrap(() => window.athena.server.ping()),
  appInfo: () => unwrap(() => window.athena.app.info()),
  themeSet: (mode) => unwrap(() => window.athena.theme.set({ mode })),
  evidenceSummary: (attemptId) => unwrap(() => window.athena.evidence.summary(attemptId ? { attemptId } : {})),
  evidenceOpenFolder: (attemptId) => unwrap(() => window.athena.evidence.openFolder(attemptId ? { attemptId } : {})),
  evidenceDeleteLocal: () => unwrap(() => window.athena.evidence.deleteLocal()),
  evidenceSave: (payload) => unwrap(() => window.athena.evidence.save(payload)),
  mediaAccess: (kind) => unwrap(() => window.athena.system.mediaAccess({ kind })),
  askCamera: () => unwrap(() => window.athena.system.askCamera()),
  displays: () => unwrap(() => window.athena.system.displays()),
  openPrivacy: (pane) => unwrap(() => window.athena.system.openPrivacy({ pane })),
  relaunch: () => unwrap(() => window.athena.system.relaunch()),
  examEnter: (attemptId) => unwrap(() => window.athena.exam.enter({ attemptId })),
  examExit: () => unwrap(() => window.athena.exam.exit()),
  examFullscreen: () => unwrap(() => window.athena.exam.fullscreen()),
  examEvent: (event) => unwrap(() => window.athena.exam.event(event)),
  confirmSubmit: (counts) => unwrap(() => window.athena.exam.confirmSubmit(counts)),
  saveReceiptPdf: (attemptId, code) => unwrap(() => window.athena.files.saveReceiptPdf({ attemptId, code })),
}

/** User-facing copy for error codes (BUILD_PLAN §20). Screens may override with their own wording. */
const MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: 'Roll number or password is wrong.',
  ACCOUNT_INACTIVE: 'This account is turned off. Ask your examiner.',
  RATE_LIMITED: 'Too many tries. Wait 15 minutes.',
  UNAUTHENTICATED: 'Please sign in again.',
  NOT_FOUND: "This doesn't exist any more.",
  SERVER_UNREACHABLE: "Can't reach the exam server.",
  EXAM_NOT_OPEN: "This exam isn't open right now.",
  NO_ATTEMPTS_LEFT: "You've used all your attempts for this exam.",
  ATTEMPT_NOT_ACTIVE: 'This attempt has already ended.',
  TIME_UP: "Time's up for this attempt.",
})

/** @param {unknown} error */
export function errorMessage(error) {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? error.message
  return 'Something went wrong.'
}
