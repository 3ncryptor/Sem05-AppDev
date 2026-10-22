// The login token lives here and nowhere else. The renderer never sees it.
// In memory while the app runs; on disk only encrypted with safeStorage (macOS Keychain-backed),
// so a relaunch can resume an exam. If encryption isn't available we keep it in memory only,
// rather than ever writing the token in plain text.
import { app, safeStorage } from 'electron'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createLogger } from './log.js'

const log = createLogger('session')

/** @type {string | null} */
let token = null
/** @type {{ id: string, rollNo: string, name: string, role: 'student' | 'admin' } | null} */
let user = null

const filePath = () => path.join(app.getPath('userData'), 'session.bin')

/** Reads session.bin once at startup. Call after app is ready (safeStorage needs it). */
export function restoreSession() {
  if (!safeStorage.isEncryptionAvailable()) return
  try {
    token = safeStorage.decryptString(readFileSync(filePath()))
  } catch (error) {
    if (error.code !== 'ENOENT') log.warn('could not restore session, signing out:', error.message)
    clearSession()
  }
}

export const getToken = () => token
export const getUser = () => user

/** @param {string} newToken @param {typeof user} newUser */
export function setSession(newToken, newUser) {
  token = newToken
  user = newUser
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('safeStorage unavailable; the session will not survive a restart')
    return
  }
  writeFileSync(filePath(), safeStorage.encryptString(newToken), { mode: 0o600 })
}

/** @param {typeof user} newUser */
export function setUser(newUser) {
  user = newUser
}

export function clearSession() {
  token = null
  user = null
  rmSync(filePath(), { force: true })
}
