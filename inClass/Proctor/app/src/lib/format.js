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
