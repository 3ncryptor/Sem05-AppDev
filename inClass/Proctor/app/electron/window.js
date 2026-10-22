// The BrowserWindow and everything that keeps it locked down (BUILD_PLAN §4 "Window and security", §17.4),
// plus light/dark theme (theme:set → nativeTheme, theme:changed → renderer).
import { BrowserWindow, app, nativeTheme, session } from 'electron'
import path from 'node:path'
import { createLogger } from './log.js'
import { APP_INDEX_URL } from './protocol.js'
import { THEME_MODES, getSettings, updateSettings } from './settings.js'
import { APP_ORIGIN, DEV_URL, handle, objectPayload, oneOf } from './validate.js'

const log = createLogger('window')

const MIN_WIDTH = 1100
const MIN_HEIGHT = 720
// Matches --canvas in styles/tokens.css, so there's no white flash before the UI paints.
const CANVAS = Object.freeze({ light: '#FBF8F2', dark: '#17181A' })

/** True when the UI comes from the Vite dev server instead of app://athena/. */
export const usesDevServer = (forceApp) => !app.isPackaged && !forceApp

/** URL to load: Vite in dev, app://athena/index.html when packaged (or when a flag asks for it). */
export function uiUrl({ forceApp = false, hash = '' } = {}) {
  const base = usesDevServer(forceApp) ? `${DEV_URL}/` : APP_INDEX_URL
  return hash ? `${base}#${hash}` : base
}

/** Is `url` part of our own UI? Used to refuse every other navigation. */
function isOwnUrl(url) {
  if (url.startsWith(`${APP_ORIGIN}/`)) return true
  if (app.isPackaged) return false
  try {
    return new URL(url).origin === new URL(DEV_URL).origin
  } catch {
    return false
  }
}

/**
 * Only the camera may be requested (getUserMedia with video). Microphone, geolocation, notifications,
 * clipboard-read and everything else are denied. Runs once per session.
 */
function lockDownSession(ses) {
  ses.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const mediaTypes = details?.mediaTypes ?? []
    const cameraOnly = permission === 'media' && mediaTypes.length > 0 && mediaTypes.every((type) => type === 'video')
    if (!cameraOnly) log.warn(`denied permission request: ${permission} ${mediaTypes.join(',')}`)
    callback(cameraOnly)
  })
  ses.setPermissionCheckHandler((_webContents, permission) => permission === 'media')
}

/** Stops the page from opening windows or navigating anywhere that isn't our UI. */
function lockDownContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    log.warn(`blocked window.open ${url}`)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (isOwnUrl(url)) return
    event.preventDefault()
    log.warn(`blocked navigation to ${url}`)
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
}

/** In dev, print what the renderer is doing so a headless run shows load and console errors. */
function logRendererInDev(contents) {
  if (app.isPackaged) return
  contents.on('did-finish-load', () => log.info(`renderer did-finish-load ${contents.getURL()}`))
  contents.on('did-fail-load', (_e, code, description, url) => log.error(`renderer did-fail-load ${code} ${description} ${url}`))
  contents.on('console-message', (event) => {
    if (event.level === 'warning' || event.level === 'error') {
      log.warn(`renderer console.${event.level}: ${event.message} (${event.sourceId}:${event.lineNumber})`)
    }
  })
  contents.on('preload-error', (_e, preloadPath, error) => log.error(`preload error ${preloadPath}: ${error.message}`))
  contents.on('render-process-gone', (_e, details) => log.error(`renderer gone: ${details.reason}`))
}

let sessionLocked = false

/**
 * @param {{ url: string, show?: boolean, backgroundThrottling?: boolean }} options
 * @returns {BrowserWindow}
 */
export function createMainWindow({ url, show = true, backgroundThrottling = true }) {
  if (!sessionLocked) {
    lockDownSession(session.defaultSession)
    sessionLocked = true
  }
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    title: 'Athena',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 15 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? CANVAS.dark : CANVAS.light,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
      backgroundThrottling,
    },
  })
  lockDownContents(window.webContents)
  logRendererInDev(window.webContents)
  if (show) window.once('ready-to-show', () => window.show())
  window.loadURL(url).catch((error) => log.error(`loadURL failed: ${error.message}`))
  return window
}

// ---- theme ----------------------------------------------------------------------------------------

/** Applies the saved theme, tells every window when macOS or the user changes it. */
export function setUpTheme() {
  nativeTheme.themeSource = getSettings().theme
  nativeTheme.on('updated', () => {
    const payload = { dark: nativeTheme.shouldUseDarkColors }
    for (const window of BrowserWindow.getAllWindows()) {
      window.setBackgroundColor(payload.dark ? CANVAS.dark : CANVAS.light)
      window.webContents.send('theme:changed', payload)
    }
  })
  handle('theme:set', (payload) => {
    const mode = oneOf(objectPayload(payload).mode, 'mode', THEME_MODES)
    updateSettings({ theme: mode })
    nativeTheme.themeSource = mode
    return { mode, dark: nativeTheme.shouldUseDarkColors }
  })
}
