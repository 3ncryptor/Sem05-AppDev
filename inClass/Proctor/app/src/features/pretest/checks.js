// C3 system check: one async runner per row (SCREENS C3). Each returns { status, kind?, detail? }:
//   status 'ok' | 'warn' (doesn't block) | 'fail' (blocks) | 'unavailable' (face model: doesn't block)
import { ipc } from '../../lib/api.js'
import { averageBrightness } from '../../proctoring/brightness.js'
import { loadFaceDetector, readFaces } from '../../proctoring/face.js'
import { cameraErrorKind, startCamera } from '../../proctoring/webcam.js'

const FACE_HOLD_MS = 2000
const FACE_TIMEOUT_MS = 12_000
const SAMPLE_MS = 200
const LOW_LIGHT = 45

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Waits until the <video> has a frame (or gives up after 5 s). */
async function frameReady(video) {
  for (let i = 0; i < 50 && (!video || video.readyState < 2 || !video.videoWidth); i += 1) await wait(100)
  return Boolean(video?.videoWidth)
}

export const ROWS = [
  { id: 'server', label: 'Exam server', okLabel: 'Exam server: connected' },
  { id: 'cameraPermission', label: 'Camera permission' },
  { id: 'camera', label: 'Camera', okLabel: 'Camera: working' },
  { id: 'face', label: 'Face', okLabel: 'Face: one face in view', needsCamera: true },
  { id: 'light', label: 'Light', okLabel: 'Light: good', needsCamera: true },
  { id: 'screen', label: 'Screen Recording permission' },
  { id: 'displays', label: 'Displays', okLabel: 'Displays: one' },
]

const RUNNERS = {
  async server() {
    const ping = await ipc.serverPing()
    return ping.ok ? { status: 'ok' } : { status: 'fail', kind: 'server' }
  },

  async cameraPermission() {
    let status = await ipc.mediaAccess('camera')
    if (status === 'not-determined') status = (await ipc.askCamera()) ? 'granted' : 'denied'
    return status === 'granted' ? { status: 'ok' } : { status: 'fail', kind: 'cameraPermission' }
  },

  async camera() {
    try {
      await startCamera()
      return { status: 'ok' }
    } catch (error) {
      return { status: 'fail', kind: cameraErrorKind(error) === 'permission' ? 'cameraPermission' : 'cameraBusy' }
    }
  },

  /** Exactly one face, held for 2 s. Reports progress 0–1 while it waits. */
  async face({ video, onProgress }) {
    const detector = await loadFaceDetector()
    if (!detector) return { status: 'unavailable', kind: 'faceUnavailable' }
    if (!(await frameReady(video))) return { status: 'fail', kind: 'cameraBusy' }
    const started = Date.now()
    let heldSince = null
    let lastCount = 0
    while (Date.now() - started < FACE_TIMEOUT_MS) {
      const reading = readFaces(video)
      lastCount = reading?.faces ?? 0
      heldSince = lastCount === 1 ? (heldSince ?? Date.now()) : null
      const held = heldSince ? Date.now() - heldSince : 0
      onProgress(Math.min(1, held / FACE_HOLD_MS))
      if (held >= FACE_HOLD_MS) return { status: 'ok' }
      await wait(SAMPLE_MS)
    }
    return { status: 'fail', kind: lastCount > 1 ? 'manyFaces' : 'noFace' }
  },

  async light({ video }) {
    if (!(await frameReady(video))) return { status: 'warn', kind: 'dark' }
    return averageBrightness(video) >= LOW_LIGHT ? { status: 'ok' } : { status: 'warn', kind: 'dark' }
  },

  async screen() {
    const status = await ipc.mediaAccess('screen')
    return status === 'granted' ? { status: 'ok' } : { status: 'fail', kind: 'screen' }
  },

  async displays({ exam }) {
    const { count } = await ipc.displays()
    if (count <= 1) return { status: 'ok', detail: count }
    const blocks = exam.proctoring?.enabled && exam.proctoring?.blockMultipleDisplays
    return { status: blocks ? 'fail' : 'warn', kind: 'displays', detail: count }
  },
}

/** Runs one row; any thrown error (e.g. an IPC failure) becomes a failed row instead of a crash. */
export async function runRow(id, context) {
  try {
    return await RUNNERS[id](context)
  } catch {
    return { status: 'fail', kind: id === 'server' ? 'server' : 'generic' }
  }
}

/** Every blocking row passed (warnings and an unavailable face model don't block; dev skips count as passed). */
export const allPassed = (rows) => Object.values(rows).every((row) => ['ok', 'warn', 'unavailable', 'skipped'].includes(row.status))

/** The summary sent with attempts.start (§21). */
export function checkSummary(rows) {
  return {
    camera: rows.camera.status === 'ok' ? 'ok' : rows.camera.status,
    face: rows.face.status === 'ok' ? 'ok' : rows.face.status === 'unavailable' ? 'unavailable' : 'failed',
    light: rows.light.status === 'ok' ? 'ok' : 'low',
    screen: rows.screen.status === 'ok' ? 'granted' : rows.screen.status,
    displays: Number.isInteger(rows.displays.detail) ? rows.displays.detail : 1,
  }
}
