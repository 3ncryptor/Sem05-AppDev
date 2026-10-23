// Athena main process: app lifecycle, profiles, single-instance lock, app:// and wiring (BUILD_PLAN §17.4).
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerApiHandlers, request, requestRaw } from './api.js'
import { handleForced, handleWarnings, installQuitGuard, registerExamHandlers } from './exam.js'
import { registerFileHandlers } from './files.js'
import { flag, isSelftest, isSpike, wantsFakeMedia } from './flags.js'
import { initHeartbeat } from './heartbeat.js'
import { initQueue } from './queue.js'
import { initEvidence, registerEvidenceHandlers } from './evidence.js'
import { createLogger } from './log.js'
import { buildMenu } from './menu.js'
import { handleAppScheme, registerAppScheme } from './protocol.js'
import { runSelftest } from './selftest.js'
import { restoreSession } from './session.js'
import { getSettings } from './settings.js'
import { registerSystemHandlers } from './system.js'
import { handle } from './validate.js'
import { createMainWindow, setUpTheme, uiUrl } from './window.js'

const log = createLogger('main')

const DEFAULT_PROFILE = 'default'
const SELFTEST_PROFILE = 'selftest'
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/

// ---- command-line flags ----------------------------------------------------------------------------

const requestedProfile = flag('profile')

// --fake-media swaps the camera for Chromium's test pattern so the camera steps can be driven by a script.
// It is refused in the packaged app, where a fake camera would defeat proctoring.
if (wantsFakeMedia && app.isPackaged) {
  console.error('[athena] --fake-media is only available in development')
  process.exit(2)
}
export const fakeMedia = wantsFakeMedia
if (fakeMedia) {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream')
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream')
}

function resolveProfile() {
  if (typeof requestedProfile === 'string') {
    if (PROFILE_PATTERN.test(requestedProfile)) return requestedProfile
    console.error(`[athena] --profile must be lowercase letters, digits and dashes (got "${requestedProfile}")`)
    process.exit(2)
  }
  return isSelftest ? SELFTEST_PROFILE : DEFAULT_PROFILE
}

const profile = resolveProfile()

// Each profile gets its own userData folder (settings, session, evidence) and therefore its own lock,
// so a student copy and an admin copy can run side by side in the viva. Must happen before 'ready'.
if (profile !== DEFAULT_PROFILE) {
  app.setPath('userData', path.join(app.getPath('appData'), `Athena-${profile}`))
}

registerAppScheme()

// ---- single instance -------------------------------------------------------------------------------

/** @type {BrowserWindow | null} */
let mainWindow = null

// The lock is keyed on the userData folder, which is why it's per profile.
if (!app.requestSingleInstanceLock()) {
  if (isSelftest) process.stdout.write(`${JSON.stringify({ error: `profile "${profile}" is already running` })}\n`)
  app.exit(isSelftest ? 1 : 0)
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.whenReady().then(start).catch((error) => {
    log.error('startup failed:', error)
    app.exit(1)
  })
}

// ---- startup -----------------------------------------------------------------------------------------

function registerIpc() {
  registerApiHandlers()
  registerSystemHandlers()
  registerEvidenceHandlers()
  registerExamHandlers()
  registerFileHandlers()
  handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    profile,
    isPackaged: app.isPackaged,
    theme: getSettings().theme,
    fakeMedia,
  }))
}

function openMainWindow() {
  mainWindow = createMainWindow({ url: uiUrl({ hash: isSpike ? '/selftest' : '' }) })
  installQuitGuard(mainWindow)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function start() {
  handleAppScheme(path.join(import.meta.dirname, '..', 'dist'))
  setUpTheme()
  registerIpc()
  if (isSelftest) {
    runSelftest({ profile })
    return
  }
  restoreSession()
  // Wiring: queue, heartbeat and evidence get the HTTP client from here, so they don't import each other.
  const replies = { onWarnings: handleWarnings, onForced: handleForced }
  initQueue({ request, ...replies })
  initHeartbeat({ request, ...replies })
  initEvidence({ requestRaw })
  buildMenu()
  openMainWindow()
  log.info(`ready · profile ${profile} · userData ${app.getPath('userData')} · ${app.isPackaged ? 'packaged' : 'dev'}`)
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && app.isReady() && !isSelftest) openMainWindow()
})

app.on('window-all-closed', () => {
  // Athena is a single-window app; closing it quits, so an exam can't keep running hidden.
  app.quit()
})
