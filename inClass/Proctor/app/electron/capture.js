// Screenshots during an exam. One shot a few seconds after the exam opens, then one every minSec–maxSec
// (the exam's proctoring.screenshots setting, 45–60 s by default). Each shot is a picture of the Athena
// window (webContents.capturePage, so macOS Screen Recording permission isn't needed), saved through
// evidence.js; then main asks the renderer for the paired webcam photo (`exam:capture-now`).
import { createLogger } from './log.js'
import { getMainWindow } from './window.js'

const log = createLogger('capture')

const SHOT_WIDTH = 1280
const JPEG_QUALITY = 70
const MS_PER_SEC = 1000
const FIRST_SHOT_MS = 3000
const DEFAULT_INTERVAL = Object.freeze({ minSec: 45, maxSec: 60 })

/**
 * @typedef {{ attempt: { id: string, code: string }, interval: { minSec: number, maxSec: number },
 *   save: (input: { attempt: object, kind: 'screen', reason: string, buffer: Buffer }) => Promise<unknown>,
 *   requestCamera: () => void, timer: NodeJS.Timeout | null, stopped: boolean }} CaptureSession
 */

/** @type {CaptureSession | null} */
let current = null

/** The exam window as JPEG bytes (at most 1280 px wide), or null when there's no window to capture. */
async function takeScreenshot() {
  const window = getMainWindow()
  if (!window || window.isDestroyed()) return null
  const image = await window.webContents.capturePage()
  if (image.isEmpty()) return null
  const sized = image.getSize().width > SHOT_WIDTH ? image.resize({ width: SHOT_WIDTH }) : image
  return sized.toJPEG(JPEG_QUALITY)
}

async function capture(session) {
  try {
    const buffer = await takeScreenshot()
    if (buffer) await session.save({ attempt: session.attempt, kind: 'screen', reason: 'interval', buffer })
    else log.warn('screenshot was empty')
  } catch (error) {
    log.warn(`screenshot failed: ${error.message}`)
  }
  // The webcam photo is still worth having when the screenshot failed.
  if (!session.stopped) session.requestCamera()
}

function schedule(session, delayMs) {
  session.timer = setTimeout(async () => {
    await capture(session)
    if (session.stopped) return
    const { minSec, maxSec } = session.interval
    schedule(session, (minSec + Math.random() * (maxSec - minSec)) * MS_PER_SEC)
  }, delayMs)
}

function intervalFrom(settings) {
  const minSec = Number.isFinite(settings?.minSec) && settings.minSec > 0 ? settings.minSec : DEFAULT_INTERVAL.minSec
  const maxSec = Number.isFinite(settings?.maxSec) && settings.maxSec >= minSec ? settings.maxSec : Math.max(minSec, DEFAULT_INTERVAL.maxSec)
  return { minSec, maxSec }
}

/** @param {{ attempt: { id: string, code: string }, settings?: { minSec?: number, maxSec?: number }, save: CaptureSession['save'], requestCamera: () => void }} options */
export function startCapture({ attempt, settings, save, requestCamera }) {
  if (current?.attempt.id === attempt.id) return
  stopCapture()
  current = { attempt, interval: intervalFrom(settings), save, requestCamera, timer: null, stopped: false }
  schedule(current, FIRST_SHOT_MS)
  log.info(`started for ${attempt.code} (every ${current.interval.minSec}–${current.interval.maxSec} s)`)
}

export function stopCapture() {
  if (!current) return
  clearTimeout(current.timer)
  current.stopped = true
  current = null
}
