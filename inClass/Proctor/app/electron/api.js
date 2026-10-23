// Main-process API client (BUILD_PLAN §4, §17.2, §18). Every HTTP call Athena makes goes through `request()`.
// The renderer asks by name (`api:request { name, params }`); main checks the name against the route table,
// fills path params, attaches the token it holds, and calls the server with net.fetch.
import { net } from 'electron'
import { createLogger } from './log.js'
import { markSubmitted } from './evidence.js'
import { exitExam, rememberAttempt } from './exam.js'
import { enqueueAnswer, flush } from './queue.js'
import { PATH_ID_PATTERN, ROUTES, SPECIAL_PARAM_PATTERNS, isKnownRoute } from './routes.js'
import { clearSession, getToken, setSession, setUser } from './session.js'
import { getSettings, updateSettings } from './settings.js'
import { IpcError, handle, isPlainObject, jsonBytes, objectPayload, serverUrl, string } from './validate.js'

const log = createLogger('api')

const REQUEST_TIMEOUT_MS = 10_000
const PING_TIMEOUT_MS = 5_000
const MAX_PARAMS_BYTES = 256 * 1024
const ROLES = ['student', 'admin']

/** Replaces `:name` segments with validated params; returns the path and the params left over. */
function fillPath(routePath, params) {
  const rest = { ...params }
  const filled = routePath.replace(/:([A-Za-z]+)/g, (_match, key) => {
    const value = rest[key]
    const pattern = SPECIAL_PARAM_PATTERNS[key] ?? PATH_ID_PATTERN
    if (typeof value !== 'string' || !pattern.test(value)) {
      throw new IpcError('IPC_REJECTED', `Path parameter "${key}" is missing or malformed`)
    }
    delete rest[key]
    return encodeURIComponent(value)
  })
  return { path: filled, rest }
}

/** GET/DELETE send leftover params as a query string (scalars only); other methods send a JSON body. */
function buildInit(method, rest) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (method === 'GET' || method === 'DELETE') return { query: toQuery(rest), init: { method, headers } }
  return { query: '', init: { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(rest) } }
}

function toQuery(rest) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
      throw new IpcError('IPC_REJECTED', `Query parameter "${key}" must be a string, number or boolean`)
    }
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** Reads the server's `{ ok, data, error }` envelope; anything else becomes SERVER_ERROR. */
async function readEnvelope(response) {
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  if (isPlainObject(body) && typeof body.ok === 'boolean') {
    if (body.ok) return { ok: true, data: body.data ?? null, error: null }
    const error = isPlainObject(body.error) ? body.error : {}
    return {
      ok: false,
      data: null,
      error: {
        code: String(error.code ?? 'SERVER_ERROR'),
        message: String(error.message ?? 'The server returned an error.'),
        ...(isPlainObject(error.fields) ? { fields: error.fields } : {}),
      },
    }
  }
  return { ok: false, data: null, error: { code: 'SERVER_ERROR', message: `The server answered ${response.status} without a valid response.` } }
}

const unreachable = () => ({
  ok: false,
  data: null,
  error: { code: 'SERVER_UNREACHABLE', message: `Can't reach the exam server at ${getSettings().serverUrl}.` },
})

/**
 * Calls one route by name. Used by `api:request` and by main itself (internal names).
 * @param {string} name @param {Record<string, unknown>} [params]
 * @returns {Promise<{ ok: boolean, data: unknown, error: null | { code: string, message: string } }>}
 */
export async function request(name, params = {}) {
  const route = ROUTES[name]
  if (!route) throw new IpcError('IPC_REJECTED', `Unknown route ${name}`)
  const { path, rest } = fillPath(route.path, params)
  const { query, init } = buildInit(route.method, rest)
  const url = `${getSettings().serverUrl}/api${path}${query}`

  let envelope
  try {
    const response = await net.fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    envelope = await readEnvelope(response)
  } catch (error) {
    log.warn(`${name} unreachable: ${error?.name ?? 'Error'}`)
    return unreachable()
  }

  if (!envelope.ok && envelope.error.code === 'UNAUTHENTICATED') clearSession()
  if (envelope.ok && route.remembersAttempt) rememberAttempt(envelope.data)
  return envelope
}

/**
 * Sends raw bytes (evidence JPEGs). Leftover params go in the query string, as §21 shows.
 * @param {string} name @param {Record<string, unknown>} params @param {Buffer} body @param {string} contentType
 */
export async function requestRaw(name, params, body, contentType) {
  const route = ROUTES[name]
  if (!route) throw new IpcError('IPC_REJECTED', `Unknown route ${name}`)
  const { path, rest } = fillPath(route.path, params)
  const headers = { Accept: 'application/json', 'Content-Type': contentType }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const url = `${getSettings().serverUrl}/api${path}${toQuery(rest)}`
  try {
    const response = await net.fetch(url, { method: route.method, headers, body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    return await readEnvelope(response)
  } catch (error) {
    log.warn(`${name} unreachable: ${error?.name ?? 'Error'}`)
    return unreachable()
  }
}

const SUBMIT_FLUSH_MS = 15_000

/** Queued routes (answers.save) go to queue.js and return at once with the queue state. */
function enqueue(name, params) {
  if (name !== 'answers.save') throw new IpcError('IPC_REJECTED', `No queue for ${name}`)
  const { attemptId, questionId, revision, response, timeSpentSec, marked } = params
  fillPath(ROUTES[name].path, { attemptId, questionId })
  if (!Number.isInteger(revision) || revision < 1) throw new IpcError('IPC_REJECTED', 'revision must be a positive integer')
  const time = Number.isInteger(timeSpentSec) && timeSpentSec >= 0 ? timeSpentSec : 0
  return { queued: true, ...enqueueAnswer({ attemptId, questionId, revision, response: response ?? null, timeSpentSec: time, marked: marked === true }) }
}

/** §22.7: send every queued answer first; if that can't finish, the renderer shows "waiting for the connection". */
async function submit(params) {
  if (!(await flush(SUBMIT_FLUSH_MS))) {
    throw new IpcError('ANSWERS_PENDING', "We're waiting for the connection to send your last answers.")
  }
  const data = passThrough(await request('attempts.submit', params))
  exitExam()
  await markSubmitted(params.attemptId).catch(() => null)
  return data
}

// ---- IPC handlers ---------------------------------------------------------------------------------

/** @param {unknown} payload */
async function handleApiRequest(payload) {
  const { name, params } = objectPayload(payload)
  if (typeof name !== 'string' || !isKnownRoute(name)) throw new IpcError('IPC_REJECTED', `Unknown route ${String(name)}`)
  if (ROUTES[name].internal) throw new IpcError('IPC_REJECTED', `Route ${name} is internal`)
  const safeParams = objectPayload(params)
  if (jsonBytes(safeParams) > MAX_PARAMS_BYTES) throw new IpcError('IPC_REJECTED', 'params over 256 KB')
  if (ROUTES[name].queued) return enqueue(name, safeParams)
  if (name === 'attempts.submit') return submit(safeParams)
  return passThrough(await request(name, safeParams))
}

/** Turns a failed server envelope into an IpcError so `handle` re-wraps it with the same code. */
function passThrough(envelope) {
  if (envelope.ok) return envelope.data
  throw new IpcError(envelope.error.code, envelope.error.message, envelope.error.fields)
}

/** Keeps only the user fields the renderer needs, and checks the role. */
function publicUser(value) {
  const user = isPlainObject(value) ? value : {}
  if (!ROLES.includes(user.role) || typeof user.id !== 'string') {
    throw new IpcError('SERVER_ERROR', 'The server sent an unexpected user.')
  }
  return { id: user.id, rollNo: String(user.rollNo ?? ''), name: String(user.name ?? ''), role: user.role }
}

async function handleLogin(payload) {
  const input = objectPayload(payload)
  const rollNo = string(input.rollNo, 'rollNo', { min: 1, max: 64 }).trim()
  const password = string(input.password, 'password', { min: 1, max: 64 })
  const data = passThrough(await request('auth.login', { rollNo, password }))
  if (!isPlainObject(data) || typeof data.token !== 'string') throw new IpcError('SERVER_ERROR', 'The server sent no token.')
  const user = publicUser(data.user)
  setSession(data.token, user)
  return { user }
}

async function handleLogout() {
  if (getToken()) {
    // Best effort: even if the server is down, the local session ends.
    await request('auth.logout').catch(() => null)
  }
  clearSession()
  return { ok: true }
}

async function handleMe() {
  if (!getToken()) return null
  const envelope = await request('auth.me')
  if (!envelope.ok && envelope.error.code === 'UNAUTHENTICATED') return null
  const data = passThrough(envelope)
  const user = publicUser(isPlainObject(data) && data.user ? data.user : data)
  setUser(user)
  return { user }
}

async function handleServerSet(payload) {
  const url = serverUrl(objectPayload(payload).url)
  if (url !== getSettings().serverUrl) {
    // A token from one server means nothing to another.
    clearSession()
    updateSettings({ serverUrl: url })
  }
  return { url }
}

/** Any HTTP answer counts as reachable; only a network failure or timeout doesn't. */
async function handleServerPing() {
  const startedAt = performance.now()
  try {
    await net.fetch(`${getSettings().serverUrl}/api/health`, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) })
    return { ok: true, ms: Math.round(performance.now() - startedAt) }
  } catch {
    return { ok: false, ms: null }
  }
}

export function registerApiHandlers() {
  handle('api:request', handleApiRequest)
  handle('auth:login', handleLogin)
  handle('auth:logout', handleLogout)
  handle('auth:me', handleMe)
  handle('server:get', () => ({ url: getSettings().serverUrl }))
  handle('server:set', handleServerSet)
  handle('server:ping', handleServerPing)
}
