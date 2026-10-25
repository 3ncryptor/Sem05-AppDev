// C3 system check: one async runner per row (SCREENS C3). Each returns { status, kind?, detail? }:
//   status 'ok' | 'warn' (doesn't block) | 'fail' (blocks)
import { ipc } from '../../lib/api.js'
import { cameraErrorKind, startCamera } from '../../proctoring/webcam.js'

export const ROWS = [
  { id: 'server', label: 'Exam server', okLabel: 'Exam server: connected' },
  { id: 'cameraPermission', label: 'Camera permission' },
  { id: 'camera', label: 'Camera', okLabel: 'Camera: working' },
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

  /** A second display is only a warning: nothing watches the screen layout during the exam. */
  async displays() {
    const { count } = await ipc.displays()
    return count <= 1 ? { status: 'ok', detail: count } : { status: 'warn', kind: 'displays', detail: count }
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

/** Every blocking row passed (warnings don't block; dev skips count as passed). */
export const allPassed = (rows) => Object.values(rows).every((row) => ['ok', 'warn', 'unavailable', 'skipped'].includes(row.status))

/** The summary sent with attempts.start (§21). */
export function checkSummary(rows) {
  return {
    camera: rows.camera.status === 'ok' ? 'ok' : rows.camera.status,
    displays: Number.isInteger(rows.displays.detail) ? rows.displays.detail : 1,
  }
}
