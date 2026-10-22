// macOS permission and display checks (BUILD_PLAN §17.2 system:*). Used by C3 System check (Phase 3).
import { app, screen, shell, systemPreferences } from 'electron'
import { getActiveAttemptId } from './exam.js'
import { IpcError, handle, objectPayload, oneOf } from './validate.js'

const MEDIA_KINDS = /** @type {const} */ (['camera', 'screen'])

// The only two URLs Athena ever opens in System Settings. Nothing from the renderer reaches openExternal.
const PRIVACY_URLS = Object.freeze({
  camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
  screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
})

function relaunch() {
  // Restarting mid-exam would look like the student quit; Phase 3's fix card only offers it before Begin.
  if (getActiveAttemptId()) throw new IpcError('IPC_REJECTED', 'Cannot restart while an exam is running')
  app.relaunch()
  app.exit(0)
}

export function registerSystemHandlers() {
  handle('system:mediaAccess', (payload) => {
    const kind = oneOf(objectPayload(payload).kind, 'kind', MEDIA_KINDS)
    return systemPreferences.getMediaAccessStatus(kind)
  })
  handle('system:askCamera', () => systemPreferences.askForMediaAccess('camera'))
  handle('system:displays', () => ({ count: screen.getAllDisplays().length }))
  handle('system:openPrivacy', async (payload) => {
    const pane = oneOf(objectPayload(payload).pane, 'pane', MEDIA_KINDS)
    await shell.openExternal(PRIVACY_URLS[pane])
    return null
  })
  handle('system:relaunch', relaunch)
}
