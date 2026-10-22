// Small persistent settings for this profile: server address and theme, in userData/settings.json.
// Written atomically (temp file + rename) so a crash mid-write never leaves a half-written file.
import { app } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createLogger } from './log.js'

const log = createLogger('settings')

export const THEME_MODES = /** @type {const} */ (['light', 'dark', 'system'])
const DEFAULTS = Object.freeze({ serverUrl: 'http://127.0.0.1:3000', theme: 'system' })

/** @type {{ serverUrl: string, theme: 'light' | 'dark' | 'system' } | null} */
let cache = null

const filePath = () => path.join(app.getPath('userData'), 'settings.json')

function load() {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), 'utf8'))
    return {
      serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : DEFAULTS.serverUrl,
      theme: THEME_MODES.includes(parsed.theme) ? parsed.theme : DEFAULTS.theme,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') log.warn('settings.json unreadable, using defaults:', error.message)
    return { ...DEFAULTS }
  }
}

export function getSettings() {
  cache ??= load()
  return cache
}

/** @param {Partial<{ serverUrl: string, theme: 'light' | 'dark' | 'system' }>} patch */
export function updateSettings(patch) {
  const next = { ...getSettings(), ...patch }
  const tmp = `${filePath()}.tmp`
  writeFileSync(tmp, JSON.stringify(next, null, 2))
  renameSync(tmp, filePath())
  cache = next
  return next
}
