// Small hand-written validators for IPC payloads, plus the one wrapper every ipcMain.handle goes through.
// The preload is the security boundary: anything arriving here is treated as untrusted input.
import { app, ipcMain } from 'electron'
import { createLogger } from './log.js'

const log = createLogger('ipc')

export const APP_ORIGIN = 'app://athena'
export const DEV_URL = process.env.ATHENA_DEV_URL ?? 'http://localhost:5173'

/** Error carrying an envelope code. Thrown by validators and handlers, turned into `{ ok: false }` by `handle`. */
export class IpcError extends Error {
  /** @param {string} code @param {string} [message] @param {Record<string, string>} [fields] */
  constructor(code, message = code, fields = undefined) {
    super(message)
    this.code = code
    this.fields = fields
  }
}

/** @template T @param {T} data */
export const ok = (data) => ({ ok: true, data: data ?? null, error: null })

/** @param {string} code @param {string} [message] @param {Record<string, string>} [fields] */
export const fail = (code, message = code, fields = undefined) => ({
  ok: false,
  data: null,
  error: { code, message, ...(fields ? { fields } : {}) },
})

/**
 * Only our own UI may call main: app://athena/… when packaged, or the Vite dev server when not.
 * @param {Electron.IpcMainInvokeEvent} event
 */
export function isTrustedSender(event) {
  const url = event.senderFrame?.url ?? ''
  if (url.startsWith(`${APP_ORIGIN}/`)) return true
  if (app.isPackaged) return false
  try {
    return new URL(url).origin === new URL(DEV_URL).origin
  } catch {
    return false
  }
}

/** Throws IPC_REJECTED unless the sender is our UI. */
export function assertTrustedSender(event) {
  if (!isTrustedSender(event)) throw new IpcError('IPC_REJECTED', 'Untrusted sender')
}

/**
 * Registers an invoke handler. Every channel returns the `{ ok, data, error }` envelope, so the renderer
 * handles success and failure the same way for HTTP calls and local calls.
 * @param {string} channel
 * @param {(payload: unknown, event: Electron.IpcMainInvokeEvent) => unknown} fn  returns the `data` part
 */
export function handle(channel, fn) {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      assertTrustedSender(event)
      return ok(await fn(payload, event))
    } catch (error) {
      if (error instanceof IpcError) {
        if (error.code === 'IPC_REJECTED') log.warn(`rejected ${channel}: ${error.message}`)
        return fail(error.code, error.message, error.fields)
      }
      log.error(`${channel} failed:`, error?.message ?? error)
      return fail('IPC_REJECTED', 'Something went wrong inside Athena.')
    }
  })
}

// ---- payload checks -------------------------------------------------------------------------------

/** @returns {value is Record<string, unknown>} */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Payload must be a plain object (or missing, which becomes `{}`). */
export function objectPayload(value) {
  if (value === undefined || value === null) return {}
  if (!isPlainObject(value)) throw new IpcError('IPC_REJECTED', 'Payload must be an object')
  return value
}

/** @param {unknown} value @param {string} name @param {{ min?: number, max?: number }} [limits] */
export function string(value, name, { min = 1, max = 256 } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw new IpcError('VALIDATION_FAILED', `${name} must be ${min}–${max} characters`, {
      [name]: `Must be ${min}–${max} characters.`,
    })
  }
  return value
}

/** @template {string} T @param {unknown} value @param {string} name @param {readonly T[]} allowed @returns {T} */
export function oneOf(value, name, allowed) {
  if (!allowed.includes(/** @type {T} */ (value))) {
    throw new IpcError('IPC_REJECTED', `${name} must be one of ${allowed.join(', ')}`)
  }
  return /** @type {T} */ (value)
}

/** Rough serialized size, used to cap `params` before anything is sent. */
export function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
}

/**
 * Server address: http(s)://host[:port] only. No credentials, path, query or hash.
 * @returns {string} the normalized origin, e.g. "http://127.0.0.1:3000"
 */
export function serverUrl(value) {
  const message = 'Use http:// or https:// followed by a host, like http://127.0.0.1:3000'
  if (typeof value !== 'string' || value.length > 200) throw new IpcError('VALIDATION_FAILED', message, { url: message })
  let url
  try {
    url = new URL(value.trim())
  } catch {
    throw new IpcError('VALIDATION_FAILED', message, { url: message })
  }
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  const isBare = !url.username && !url.password && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash
  if (!isHttp || !url.hostname || !isBare) throw new IpcError('VALIDATION_FAILED', message, { url: message })
  return url.origin
}
