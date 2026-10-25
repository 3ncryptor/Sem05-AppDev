// Pure helpers for A8: filters, search and the "last active" wording.
import { formatWhen } from '../../../lib/format.js'

export const STUDENT_STATUS = Object.freeze({
  active: { symbol: '●', label: 'Active', tone: 'ok' },
  off: { symbol: '○', label: 'Off', tone: 'neutral' },
})

export const FILTERS = Object.freeze([
  { id: 'all', label: 'All', match: () => true },
  { id: 'active', label: 'Active', match: (user) => user.active },
  { id: 'off', label: 'Off', match: (user) => !user.active },
])

/** Case-insensitive match on roll number or name. */
export function matchesSearch(user, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return user.rollNo.toLowerCase().includes(needle) || user.name.toLowerCase().includes(needle)
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

/** "just now" · "4 min ago" · "3 h ago" · "25 Oct, 10:22" · "never" */
export function lastActiveLabel(iso, nowMs) {
  if (!iso) return 'never'
  const ago = nowMs - Date.parse(iso)
  if (ago < MINUTE_MS) return 'just now'
  if (ago < HOUR_MS) return `${Math.floor(ago / MINUTE_MS)} min ago`
  if (ago < 12 * HOUR_MS) return `${Math.floor(ago / HOUR_MS)} h ago`
  return formatWhen(iso, new Date(nowMs))
}

/** Copies text; resolves false when the clipboard is unavailable. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
