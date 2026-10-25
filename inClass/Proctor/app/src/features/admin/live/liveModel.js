// Pure helpers for A9: status and connection chips, time wording, row order and counters.
import { ATTEMPT_STATUS } from '../../../lib/status.js'

export const POLL_MS = 5000
/** Matches the server's TIMING.ATTENTION_SILENCE_MS: heartbeats come every 10 s. */
export const OFFLINE_AFTER_SEC = 30
export const MAX_EXTEND_MINUTES = 180

const SUBMIT_REASON_KEY = { student: 'submitted', deadline: 'deadline', flag_limit: 'flag_limit', admin: 'admin' }

/** @param {{ status: string, submitReason: string | null }} attempt */
export const statusSpec = (attempt) =>
  attempt.status === 'in_progress' ? ATTEMPT_STATUS.in_progress : ATTEMPT_STATUS[SUBMIT_REASON_KEY[attempt.submitReason] ?? 'submitted']

export const isWriting = (attempt) => attempt.status === 'in_progress'

/** Online means a heartbeat arrived recently and the app hasn't reported itself offline. */
export const isOnline = (attempt) => isWriting(attempt) && attempt.secondsSinceSeen <= OFFLINE_AFTER_SEC && attempt.sensors?.online !== false

/** 45 → "45 s" · 300 → "5 min" · 7200 → "2 h" */
export function agoLabel(seconds) {
  if (seconds < 60) return `${Math.max(0, seconds)} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  return `${Math.floor(seconds / 3600)} h`
}

/** 754 → "12:34" · 3725 → "1:02:05" */
export function clockLabel(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec))
  const pad = (n) => String(n).padStart(2, '0')
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(sec % 60)}` : `${m}:${pad(sec % 60)}`
}

export const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—')

/** Writing first (least time left first), then finished, then by name. */
export function sortAttempts(attempts) {
  return attempts.toSorted((a, b) => {
    if (isWriting(a) !== isWriting(b)) return isWriting(a) ? -1 : 1
    if (isWriting(a) && a.timeLeftSec !== b.timeLeftSec) return a.timeLeftSec - b.timeLeftSec
    return a.student.name.localeCompare(b.student.name)
  })
}

export function countersOf(attempts) {
  const writing = attempts.filter(isWriting)
  return {
    writing: writing.length,
    online: writing.filter(isOnline).length,
    offline: writing.filter((a) => !isOnline(a)).length,
    finished: attempts.length - writing.length,
  }
}

/** The new deadline after adding `minutes`, as "HH:MM". */
export const newEndLabel = (deadlineAt, minutes) => timeOf(new Date(Date.parse(deadlineAt) + minutes * 60_000).toISOString())

/** Whole minutes in 1..MAX_EXTEND_MINUTES, or null. */
export function parseMinutes(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= MAX_EXTEND_MINUTES ? n : null
}
