// The running exam (BUILD_PLAN §17.4): which attempt is active, fullscreen, the heartbeat, renderer events,
// the submit confirm (C12) and the quit confirm (C13).
import { app, dialog } from 'electron'
import { startHeartbeat, stopHeartbeat } from './heartbeat.js'
import { createLogger } from './log.js'
import { enqueueEvent, getNetStatus, persistNow } from './queue.js'
import { PATH_ID_PATTERN } from './routes.js'
import { IpcError, handle, objectPayload, oneOf } from './validate.js'
import { broadcast, getMainWindow } from './window.js'

const log = createLogger('exam')

// §17.2: the only event types the renderer may report (main detects the rest itself in Loop 3).
const RENDERER_EVENT_TYPES = /** @type {const} */ ([
  'clipboard_attempt', 'camera_lost', 'camera_restored', 'no_face', 'multiple_faces', 'face_too_far', 'low_light',
  'face_detection_unavailable',
])

/** @typedef {{ id: string, code: string, deadlineAt: string, status: string }} KnownAttempt */

/** Attempts the server returned to this session (attempts.start / attempts.get). Only these can be entered. */
const knownAttempts = new Map()
/** @type {KnownAttempt | null} */
let active = null
/** Set once the student chose "Quit anyway", so the second close/quit goes through. */
let quitConfirmed = false

/** Called by api.js after attempts.start / attempts.get succeed. */
export function rememberAttempt(data) {
  const attempt = data?.attempt
  if (typeof attempt?.id !== 'string') return
  knownAttempts.set(attempt.id, { id: attempt.id, code: attempt.code, deadlineAt: attempt.deadlineAt, status: attempt.status })
  if (active?.id === attempt.id) active = knownAttempts.get(attempt.id)
}

export const getKnownAttempt = (id) => knownAttempts.get(id) ?? null
export const getActiveAttemptId = () => active?.id ?? null

function requireAttemptId(value) {
  if (typeof value !== 'string' || !PATH_ID_PATTERN.test(value)) throw new IpcError('IPC_REJECTED', 'Bad attempt id')
  return value
}

/** exam:enter: fullscreen + heartbeat. Idempotent, so C6 and the exam room can both call it. */
function enterExam(payload) {
  const attemptId = requireAttemptId(objectPayload(payload).attemptId)
  const attempt = knownAttempts.get(attemptId)
  if (!attempt) throw new IpcError('IPC_REJECTED', 'Unknown attempt')
  if (attempt.status !== 'in_progress') throw new IpcError('ATTEMPT_NOT_ACTIVE', 'This attempt has ended.')
  active = attempt
  getMainWindow()?.setFullScreen(true)
  startHeartbeat(attemptId)
  return { ok: true, net: getNetStatus() }
}

/** Leaves the exam: stop the heartbeat and leave fullscreen. Evidence uploads keep going. */
export function exitExam() {
  if (active) log.info(`exit ${active.id}`)
  if (active) knownAttempts.set(active.id, { ...active, status: 'submitted' })
  active = null
  stopHeartbeat()
  getMainWindow()?.setFullScreen(false)
}

/** The server ended the attempt (deadline, flags, examiner): stop and tell the renderer (C14). */
export function handleForced(attemptId, forced) {
  if (active?.id !== attemptId) return
  exitExam()
  broadcast('exam:forced', { submitReason: forced.submitReason })
}

export function handleWarnings(warnings) {
  for (const warning of warnings) broadcast('exam:warning', warning)
}

function reportEvent(payload) {
  if (!active) throw new IpcError('ATTEMPT_NOT_ACTIVE', 'No exam is running')
  const input = objectPayload(payload)
  const type = oneOf(input.type, 'type', RENDERER_EVENT_TYPES)
  const phase = input.phase === undefined ? undefined : oneOf(input.phase, 'phase', ['start', 'end'])
  const extra = typeof input.questionId === 'string' && PATH_ID_PATTERN.test(input.questionId) ? { questionId: input.questionId } : {}
  enqueueEvent(active.id, { type, ...(phase ? { phase } : {}), ...extra, payload: objectPayload(input.payload) })
  return null
}

const isCount = (value) => Number.isInteger(value) && value >= 0 && value <= 10_000

/** C12 native sheet: "Submit your exam? 10 of 12 answered." */
async function confirmSubmit(payload) {
  const { answered, total, marked } = objectPayload(payload)
  if (![answered, total, marked].every(isCount)) throw new IpcError('IPC_REJECTED', 'Counts must be integers')
  const markedLine = marked > 0 ? ` ${marked} marked for review.` : ''
  const { response } = await dialog.showMessageBox(getMainWindow(), {
    type: 'question',
    buttons: ['Submit', 'Keep working'],
    defaultId: 1,
    cancelId: 1,
    message: `Submit your exam? ${answered} of ${total} answered.`,
    detail: `After you submit, you can't change your answers.${markedLine}`,
  })
  return response === 0
}

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** C13: true if the app may close. */
function confirmQuit() {
  if (!active || quitConfirmed) return true
  const window = getMainWindow()
  const response = dialog.showMessageBoxSync(window, {
    type: 'warning',
    buttons: ['Keep working', 'Quit anyway'],
    defaultId: 0,
    cancelId: 0,
    message: 'Your exam is still running',
    detail: `The clock won't stop if you quit. You can reopen Athena and resume until ${formatTime(active.deadlineAt)}.`,
  })
  if (response !== 1) return false
  enqueueEvent(active.id, { type: 'app_quit' })
  persistNow()
  quitConfirmed = true
  return true
}

/** Hooks the window's close and the app's before-quit (⌘Q) to the C13 confirm. */
export function installQuitGuard(window) {
  window.on('close', (event) => {
    if (!confirmQuit()) event.preventDefault()
  })
}

app.on('before-quit', (event) => {
  if (!confirmQuit()) event.preventDefault()
})

export function registerExamHandlers() {
  handle('exam:enter', enterExam)
  handle('exam:exit', () => {
    exitExam()
    return null
  })
  handle('exam:fullscreen', () => {
    if (!active) throw new IpcError('ATTEMPT_NOT_ACTIVE', 'No exam is running')
    getMainWindow()?.setFullScreen(true)
    return null
  })
  handle('exam:event', reportEvent)
  handle('dialog:confirmSubmit', confirmSubmit)
}
