// Filters and cell text for the A2 exams table, kept out of the component so it stays readable.
import { formatWindow } from '../../../lib/format.js'

export const FILTERS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'live', label: 'Live' },
  { id: 'closed', label: 'Closed' },
])

/** @param {{ displayStatus: string }} row @param {string} filter */
export const matchesFilter = (row, filter) => filter === 'all' || row.displayStatus === filter

/** @param {{ title: string, code: string }} row @param {string} query */
export function matchesQuery(row, query) {
  const needle = query.trim().toLowerCase()
  return !needle || row.title.toLowerCase().includes(needle) || row.code.toLowerCase().includes(needle)
}

export const questionsCell = (row) => `${row.questionCount} · ${row.totalMarks} mk`

export const windowCell = (row) => (row.opensAt && row.closesAt ? formatWindow(row.opensAt, row.closesAt) : '(not set)')

export const attemptsCell = (row) => (row.displayStatus === 'draft' ? '—' : `${row.attemptsStarted} / ${row.studentCount}`)

export function resultsCell(row) {
  if (row.displayStatus === 'draft') return '—'
  if (row.resultVisibility === 'after_submit') return 'Right after'
  return row.resultsPublishedAt ? 'Published' : 'On publish'
}
