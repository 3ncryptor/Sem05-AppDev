// The only bridge between the page and Electron (BUILD_PLAN §17.1). Runs sandboxed, so it must be CommonJS.
// Each function calls exactly one channel. ipcRenderer itself is never exposed, and `on()` only accepts
// the main → renderer events listed in §17.3.
const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel) => (payload) => ipcRenderer.invoke(channel, payload)

const EXAM_EVENTS = new Set([
  'exam:heartbeat',
  'exam:warning',
  'exam:info',
  'exam:forced',
  'exam:sensor',
  'exam:capture-now',
])

/** Subscribes to one event and returns an unsubscribe function. The callback gets only the payload. */
function subscribe(channel, callback) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function')
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('athena', {
  api: (name, params) => ipcRenderer.invoke('api:request', { name, params }),
  auth: {
    login: invoke('auth:login'),
    logout: invoke('auth:logout'),
    me: invoke('auth:me'),
  },
  server: {
    get: invoke('server:get'),
    set: invoke('server:set'),
    ping: invoke('server:ping'),
  },
  app: {
    info: invoke('app:info'),
  },
  theme: {
    set: invoke('theme:set'),
    onChange: (callback) => subscribe('theme:changed', callback),
  },
  system: {
    mediaAccess: invoke('system:mediaAccess'),
    askCamera: invoke('system:askCamera'),
    displays: invoke('system:displays'),
    openPrivacy: invoke('system:openPrivacy'),
    relaunch: invoke('system:relaunch'),
  },
  exam: {
    enter: invoke('exam:enter'),
    exit: invoke('exam:exit'),
    fullscreen: invoke('exam:fullscreen'),
    event: invoke('exam:event'),
    confirmSubmit: invoke('dialog:confirmSubmit'),
    on: (name, callback) => {
      if (!EXAM_EVENTS.has(name)) throw new Error(`Unknown exam event: ${name}`)
      return subscribe(name, callback)
    },
  },
  evidence: {
    save: invoke('evidence:save'),
    summary: invoke('evidence:summary'),
    adminImage: invoke('evidence:adminImage'),
  },
  files: {
    openCsv: invoke('file:openCsv'),
    saveCsv: invoke('file:saveCsv'),
    saveReceiptPdf: invoke('receipt:savePdf'),
    exportResultsCsv: invoke('results:exportCsv'),
  },
  net: {
    onStatus: (callback) => subscribe('net:status', callback),
  },
})
