// Durable FIFO for answers and events (BUILD_PLAN §4 "Answers survive a crash", §17.4, §22.3).
//
// Every answer and event is written to userData/queue.json BEFORE it is sent, so a crash, a quit or a
// dropped connection loses nothing: the next launch (or reconnect) sends the queue in order.
// - Answers collapse per question: only the newest revision is kept (older ones would be ignored anyway).
// - Events get a per-attempt `seq`, so the server can drop repeats when a send is retried.
// - One request at a time. Network failure → back off 1, 2, 4, 8, 16, 30 s and report offline.
// - Main sends `net:status { online, queued }` to the window whenever either changes.
import { app } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createLogger } from './log.js'
import { broadcast } from './window.js'

const log = createLogger('queue')

const BACKOFF_SECONDS = [1, 2, 4, 8, 16, 30]
const MAX_EVENTS_PER_REQUEST = 50
/** Errors that will never succeed on retry; the item is dropped (and logged). */
const PERMANENT_CODES = new Set([
  'VALIDATION_FAILED', 'INVALID_RESPONSE', 'NOT_FOUND', 'FORBIDDEN', 'TIME_UP', 'ATTEMPT_NOT_ACTIVE', 'IPC_REJECTED',
  'PAYLOAD_TOO_LARGE',
])

/** @typedef {{ id: string, kind: 'answer' | 'event', attemptId: string, questionId?: string, body: object }} Item */

let state = { items: /** @type {Item[]} */ ([]), seq: /** @type {Record<string, number>} */ ({}) }
let online = true
let failures = 0
let sending = false
let retryTimer = null
let nextId = 1
/** Wired by main.js: the HTTP client and what to do with server replies. */
let deps = { request: null, onWarnings: () => {}, onForced: () => {} }

const filePath = () => path.join(app.getPath('userData'), 'queue.json')

function persist() {
  const tmp = `${filePath()}.tmp`
  writeFileSync(tmp, JSON.stringify(state))
  renameSync(tmp, filePath())
}

function emitStatus() {
  broadcast('net:status', getNetStatus())
}

export const getNetStatus = () => ({ online, queued: state.items.length })

/** Heartbeat and the evidence worker report the network too, so the banner reflects every request. */
export function reportNetwork(isOnline) {
  if (isOnline === online) return
  online = isOnline
  emitStatus()
  if (isOnline) kick()
}

/** @param {typeof deps} wiring */
export function initQueue(wiring) {
  deps = { ...deps, ...wiring }
  try {
    const saved = JSON.parse(readFileSync(filePath(), 'utf8'))
    state = { items: Array.isArray(saved.items) ? saved.items : [], seq: saved.seq ?? {} }
    nextId = state.items.length + 1
    if (state.items.length) log.info(`restored ${state.items.length} unsent item(s)`)
  } catch (error) {
    if (error.code !== 'ENOENT') log.warn('queue.json unreadable, starting empty:', error.message)
  }
  kick()
}

function add(item) {
  state = { ...state, items: [...state.items, { ...item, id: `q${Date.now()}-${nextId++}` }] }
  persist()
  emitStatus()
  kick()
}

/**
 * Queues an answer, replacing any unsent answer for the same question.
 * @param {{ attemptId: string, questionId: string, revision: number, response: unknown, timeSpentSec?: number, marked?: boolean }} answer
 */
export function enqueueAnswer({ attemptId, questionId, ...body }) {
  const sameQuestion = (item) => item.kind === 'answer' && item.attemptId === attemptId && item.questionId === questionId
  const older = state.items.find(sameQuestion)
  if (older && older.body.revision >= body.revision) return getNetStatus()
  state = { ...state, items: state.items.filter((item) => !sameQuestion(item)) }
  add({ kind: 'answer', attemptId, questionId, body })
  return getNetStatus()
}

/** Queues one event with the next seq for this attempt. @param {string} attemptId @param {object} event */
export function enqueueEvent(attemptId, event) {
  const seq = (state.seq[attemptId] ?? 0) + 1
  state = { ...state, seq: { ...state.seq, [attemptId]: seq } }
  add({ kind: 'event', attemptId, body: { seq, clientTs: new Date().toISOString(), ...event } })
}

/** Next seq for heartbeats share the same counter so every message of an attempt is ordered. */
export function nextSeq(attemptId) {
  const seq = (state.seq[attemptId] ?? 0) + 1
  state = { ...state, seq: { ...state.seq, [attemptId]: seq } }
  persist()
  return seq
}

/** The next request: the oldest item, plus any events right behind it for the same attempt. */
function nextBatch() {
  const [first] = state.items
  if (!first) return null
  if (first.kind === 'answer') return { items: [first] }
  const events = []
  for (const item of state.items) {
    if (item.kind !== 'event' || item.attemptId !== first.attemptId || events.length === MAX_EVENTS_PER_REQUEST) break
    events.push(item)
  }
  return { items: events }
}

function send(batch) {
  const [first] = batch.items
  if (first.kind === 'answer') {
    return deps.request('answers.save', { attemptId: first.attemptId, questionId: first.questionId, ...first.body })
  }
  return deps.request('attempts.events', { attemptId: first.attemptId, events: batch.items.map((item) => item.body) })
}

function remove(batch) {
  const sent = new Set(batch.items.map((item) => item.id))
  state = { ...state, items: state.items.filter((item) => !sent.has(item.id)) }
  persist()
}

function scheduleRetry() {
  const delay = BACKOFF_SECONDS[Math.min(failures, BACKOFF_SECONDS.length - 1)] * 1000
  failures += 1
  clearTimeout(retryTimer)
  retryTimer = setTimeout(kick, delay)
}

/** Sends items one request at a time until the queue is empty or the network fails. */
async function drain() {
  for (let batch = nextBatch(); batch; batch = nextBatch()) {
    const envelope = await send(batch)
    if (!envelope.ok && envelope.error.code === 'SERVER_UNREACHABLE') {
      reportNetwork(false)
      scheduleRetry()
      return
    }
    failures = 0
    reportNetwork(true)
    if (!envelope.ok && !PERMANENT_CODES.has(envelope.error.code)) {
      // e.g. UNAUTHENTICATED or SERVER_ERROR: keep it and try later rather than lose an answer.
      log.warn(`${batch.items[0].kind} kept after ${envelope.error.code}`)
      scheduleRetry()
      return
    }
    if (!envelope.ok) log.warn(`${batch.items[0].kind} dropped: ${envelope.error.code}`)
    remove(batch)
    emitStatus()
    if (envelope.ok && batch.items[0].kind === 'event') handleEventReply(batch.items[0].attemptId, envelope.data)
  }
}

function handleEventReply(attemptId, data) {
  if (data?.warnings?.length) deps.onWarnings(data.warnings)
  if (data?.forced) deps.onForced(attemptId, data.forced)
}

/** Starts sending now (no-op if a send is already running). */
export function kick() {
  if (sending || !deps.request) return
  clearTimeout(retryTimer)
  sending = true
  drain()
    .catch((error) => {
      log.error('send failed:', error.message)
      scheduleRetry()
    })
    .finally(() => {
      sending = false
    })
}

const FLUSH_POLL_MS = 200

/**
 * Tries to empty the queue (used before submit). Resolves true once empty, false if it can't in time.
 * @param {number} timeoutMs
 */
export async function flush(timeoutMs) {
  failures = 0
  kick()
  const deadline = Date.now() + timeoutMs
  while (state.items.length > 0 && Date.now() < deadline) {
    // The backoff timer keeps retrying; we only wait and watch.
    await new Promise((resolve) => setTimeout(resolve, FLUSH_POLL_MS))
  }
  return state.items.length === 0
}

/** Writes the queue now (the quit path calls this before the app exits). */
export const persistNow = persist
