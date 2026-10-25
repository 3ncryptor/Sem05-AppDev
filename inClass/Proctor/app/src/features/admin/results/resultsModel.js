// Pure helpers for result rows (A10, A11): status keys, ranks, durations and score text.
import { ATTEMPT_STATUS } from '../../../lib/status.js'

/** Key into ATTEMPT_STATUS: in progress, or how the attempt ended. */
export function attemptStatusKey(row) {
  if (row.status === 'in_progress') return 'in_progress'
  return ATTEMPT_STATUS[row.submitReason] ? row.submitReason : 'submitted'
}

/** Key into RESULT_STATUS. */
export function resultStatusKey(row) {
  if (row.held) return 'held'
  return row.resultVisible ? 'visible' : 'not_available'
}

export const canRelease = (row) => row.status === 'submitted' && !row.held && !row.resultVisible

/** "32.5 / 40", or "—" while there is no score. */
export const scoreText = (score, maxScore) => (score === null || score === undefined ? '—' : `${score} / ${maxScore}`)

export const percentText = (percent) => (percent === null || percent === undefined ? '—' : `${percent} %`)

/** 1450 → "24 m 10 s" */
export function formatDuration(totalSec) {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '—'
  const minutes = Math.floor(totalSec / 60)
  const seconds = Math.round(totalSec % 60)
  return minutes > 0 ? `${minutes} m ${seconds} s` : `${seconds} s`
}

/** Seconds from start to submit, when the row carries both times. */
export function timeTakenSec(row) {
  if (!row.startedAt || !row.submittedAt) return null
  return (Date.parse(row.submittedAt) - Date.parse(row.startedAt)) / 1000
}

const hasScore = (row) => row.status === 'submitted' && row.score !== null

/** Scored rows first, highest score first, equal scores share a rank; the rest follow unranked. */
export function rankRows(rows) {
  const scored = rows.filter(hasScore).toSorted((a, b) => b.score - a.score)
  const ranked = scored.map((row) => ({ ...row, rank: scored.findIndex((other) => other.score === row.score) + 1 }))
  const rest = rows.filter((row) => !hasScore(row)).map((row) => ({ ...row, rank: null }))
  return [...ranked, ...rest]
}
