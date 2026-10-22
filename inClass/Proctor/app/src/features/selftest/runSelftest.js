// Phase 0 spike, run by `--selftest`: load MediaPipe from the app bundle and count faces on a blank frame.
// A blank frame must give 0 faces; getting any number back proves the wasm, the model and inference all work.
import { countFaces, faceDetectorError, loadFaceDetector } from '../../proctoring/face.js'

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 240

/** @returns {Promise<{ ok: boolean, faces?: number, loadMs?: number, error?: string }>} */
export async function runSelftest() {
  const startedAt = performance.now()
  const detector = await loadFaceDetector()
  if (!detector) return { ok: false, error: faceDetectorError() ?? 'detector did not load' }
  const loadMs = Math.round(performance.now() - startedAt)

  const canvas = Object.assign(document.createElement('canvas'), { width: FRAME_WIDTH, height: FRAME_HEIGHT })
  const context = canvas.getContext('2d')
  context.fillStyle = '#808080'
  context.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT)
  try {
    return { ok: true, faces: countFaces(canvas).length, loadMs }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
