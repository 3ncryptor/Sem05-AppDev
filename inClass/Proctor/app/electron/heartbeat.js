// Heartbeat (BUILD_PLAN §22.4): every 10 s while an exam runs, tell the server we're alive and how the
// window looks, and learn the server's clock, deadline, flag count and whether the attempt was ended.
//
// The clock: offset = serverNow − local time at the response. We keep the median of the last 5, because
// one slow response would otherwise skew the timer. The renderer shows deadlineAt − (Date.now() + offset).
import { screen } from 'electron'
import { createLogger } from './log.js'
import { nextSeq, reportNetwork } from './queue.js'
import { broadcast, getMainWindow } from './window.js'

const log = createLogger('heartbeat')

const INTERVAL_MS = 10_000
const OFFSET_SAMPLES = 5

let timer = null
let attemptId = null
let offsets = []
let deps = { request: null, onWarnings: () => {}, onForced: () => {} }

/** @param {typeof deps} wiring */
export function initHeartbeat(wiring) {
  deps = { ...deps, ...wiring }
}

function median(values) {
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** What the server records as the last sensor state (camera and faces arrive with Loop 3). */
function sensors(online) {
  const window = getMainWindow()
  return {
    fullscreen: Boolean(window?.isFullScreen()),
    focused: Boolean(window?.isFocused()),
    displays: screen.getAllDisplays().length,
    online,
  }
}

async function beat() {
  if (!attemptId || !deps.request) return
  const current = attemptId
  const envelope = await deps.request('attempts.heartbeat', {
    attemptId: current,
    seq: nextSeq(current),
    sensors: sensors(true),
    events: [],
  })
  if (current !== attemptId) return
  if (!envelope.ok) {
    if (envelope.error.code === 'SERVER_UNREACHABLE') reportNetwork(false)
    else log.warn(`heartbeat failed: ${envelope.error.code}`)
    return
  }
  reportNetwork(true)
  const data = envelope.data
  offsets = [...offsets, Date.parse(data.serverNow) - Date.now()].slice(-OFFSET_SAMPLES)
  broadcast('exam:heartbeat', {
    serverNow: data.serverNow,
    deadlineAt: data.deadlineAt,
    status: data.status,
    flagCount: data.flagCount,
    maxFlags: data.maxFlags,
    offsetMs: median(offsets),
  })
  if (data.warnings?.length) deps.onWarnings(data.warnings)
  if (data.forced) deps.onForced(current, data.forced)
}

const safeBeat = () => beat().catch((error) => log.error('beat crashed:', error.message))

/** @param {string} id */
export function startHeartbeat(id) {
  if (attemptId === id && timer) return
  stopHeartbeat()
  attemptId = id
  offsets = []
  safeBeat()
  timer = setInterval(safeBeat, INTERVAL_MS)
}

export function stopHeartbeat() {
  clearInterval(timer)
  timer = null
  attemptId = null
}
