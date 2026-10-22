// Local evidence folders (BUILD_PLAN §4): userData/evidence/<attempt>/{screen,camera,identity}/ + manifest.json.
// Phase 2 provides what Settings (S3) needs: where the folder is, how much is stored, and Show in Finder.
// Saving images, the upload worker and real deletion arrive with Phases 3–5.
import { app, dialog, BrowserWindow, shell } from 'electron'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { handle, objectPayload, IpcError } from './validate.js'

const evidenceRoot = () => path.join(app.getPath('userData'), 'evidence')

/** Total bytes of every file under `dir`. */
async function folderBytes(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return folderBytes(full)
      return entry.isFile() ? (await stat(full)).size : 0
    }),
  )
  return sizes.reduce((sum, size) => sum + size, 0)
}

/** Images in an attempt's manifest that the server hasn't confirmed yet. */
async function pendingInManifest(attemptDir) {
  try {
    const manifest = JSON.parse(await readFile(path.join(attemptDir, 'manifest.json'), 'utf8'))
    const entries = Array.isArray(manifest?.entries) ? manifest.entries : []
    return entries.filter((entry) => entry?.uploaded !== true).length
  } catch {
    return 0
  }
}

async function listAttemptDirs() {
  const entries = await readdir(evidenceRoot(), { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(evidenceRoot(), entry.name))
}

async function summary() {
  const dirs = await listAttemptDirs()
  const pending = await Promise.all(dirs.map(pendingInManifest))
  return {
    folder: evidenceRoot(),
    attempts: dirs.length,
    bytes: await folderBytes(evidenceRoot()),
    pending: pending.reduce((sum, count) => sum + count, 0),
  }
}

/** Opens the evidence root, or one attempt's folder inside it. Never anything outside the root. */
async function openFolder(payload) {
  const { attemptId } = objectPayload(payload)
  const root = evidenceRoot()
  await mkdir(root, { recursive: true })
  let target = root
  if (attemptId !== undefined) {
    if (typeof attemptId !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(attemptId)) {
      throw new IpcError('IPC_REJECTED', 'Bad attempt id')
    }
    target = path.resolve(root, attemptId)
    if (!target.startsWith(root + path.sep)) throw new IpcError('IPC_REJECTED', 'Outside evidence folder')
  }
  const failure = await shell.openPath(target)
  if (failure) throw new IpcError('NOT_FOUND', failure)
  return null
}

/**
 * Phase 2: nothing qualifies for deletion yet, because no attempt can be marked submitted and uploaded
 * until Phase 5 writes manifests. It still asks first, so the flow is the real one.
 */
async function deleteLocal(_payload, event) {
  const { attempts } = await summary()
  if (attempts === 0) return { deleted: 0, kept: 0 }
  const window = BrowserWindow.fromWebContents(event.sender)
  const { response } = await dialog.showMessageBox(window, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Delete local evidence?',
    detail: 'Only attempts that are submitted and fully uploaded are deleted. Everything else is kept.',
  })
  if (response !== 0) return null
  return { deleted: 0, kept: attempts }
}

export function registerEvidenceHandlers() {
  handle('evidence:summary', summary)
  handle('evidence:openFolder', openFolder)
  handle('evidence:deleteLocal', deleteLocal)
}
