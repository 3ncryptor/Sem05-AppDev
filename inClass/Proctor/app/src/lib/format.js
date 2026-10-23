// Small display helpers shared by screens.

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB']

/** 41_234_567 → "41 MB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), BYTE_UNITS.length - 1)
  const value = bytes / 1000 ** exponent
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[exponent]}`
}

/** "Asha Rao" → "AR" */
export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** "http://127.0.0.1:3000" → "127.0.0.1:3000" */
export const hostOf = (url) => String(url ?? '').replace(/^https?:\/\//, '')

/** Replaces the home folder with ~ for display. */
export const tildePath = (path) => String(path ?? '').replace(/^\/Users\/[^/]+/, '~')

const sameDay = (a, b) => a.toDateString() === b.toDateString()
const timeOf = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
const dayOf = (date) => date.toLocaleDateString([], { day: 'numeric', month: 'short' })

/** "today, 18:00" · "tomorrow, 09:00" · "26 Oct, 10:00" */
export function formatWhen(iso, now = new Date()) {
  if (!iso) return '—'
  const date = new Date(iso)
  const tomorrow = new Date(now.getTime() + 86_400_000)
  if (sameDay(date, now)) return `today, ${timeOf(date)}`
  if (sameDay(date, tomorrow)) return `tomorrow, ${timeOf(date)}`
  return `${dayOf(date)}, ${timeOf(date)}`
}

/** "Today 09:00 to 18:00" or "24 Oct 09:00 to 25 Oct 18:00" */
export function formatWindow(opensAt, closesAt, now = new Date()) {
  if (!opensAt || !closesAt) return 'Not scheduled'
  const opens = new Date(opensAt)
  const closes = new Date(closesAt)
  const day = sameDay(opens, now) ? 'Today' : dayOf(opens)
  if (sameDay(opens, closes)) return `${day} ${timeOf(opens)} to ${timeOf(closes)}`
  return `${day} ${timeOf(opens)} to ${dayOf(closes)} ${timeOf(closes)}`
}

/** "25 Oct 2026, 10:24" */
export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

/** Whole minutes left, never negative. */
export const minutesLeft = (deadlineAt, nowMs = Date.now()) => Math.max(0, Math.floor((Date.parse(deadlineAt) - nowMs) / 60_000))

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
