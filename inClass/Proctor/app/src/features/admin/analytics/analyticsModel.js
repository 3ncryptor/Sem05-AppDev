// Pure helpers for A12: high / low from result rows, and display text for the tiles and tables.
import { formatDuration } from '../results/resultsModel.js'

const TYPE_LABELS = Object.freeze({
  single: 'Single choice',
  multi: 'Multiple choice',
  true_false: 'True / false',
  short_text: 'Short text',
  numeric: 'Numeric',
  ordering: 'Ordering',
  matching: 'Matching',
})

export const typeLabel = (type) => TYPE_LABELS[type] ?? type

/** Highest and lowest percent among submitted, scored rows (analytics has no high / low of its own). */
export function highLow(rows) {
  const percents = rows.filter((r) => r.status === 'submitted' && r.percent !== null).map((r) => r.percent)
  if (percents.length === 0) return { high: null, low: null }
  return { high: Math.max(...percents), low: Math.min(...percents) }
}

export const percentOrDash = (value) => (value === null || value === undefined ? '—' : `${value} %`)

/** "24 m of 30 m" */
export function timeUsedText(avgSec, durationMinutes) {
  if (avgSec === null || avgSec === undefined) return '—'
  return `${Math.round(avgSec / 60)} m of ${durationMinutes} m`
}

export const secondsText = (sec) => (sec === null || sec === undefined ? '—' : formatDuration(sec))

/** Questions with the lowest percent correct first; unanswered ones last. */
export const hardestFirst = (questions) =>
  questions.toSorted((a, b) => (a.percentCorrect ?? Infinity) - (b.percentCorrect ?? Infinity))
