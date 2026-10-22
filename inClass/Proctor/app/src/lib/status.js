// Status chips use the same words everywhere (SCREENS §0.4). Each has a symbol and a word, never colour alone.

/** @typedef {{ symbol: string, label: string, tone: 'neutral' | 'focus' | 'ok' | 'attention' | 'critical' }} ChipSpec */

/** @type {Record<string, ChipSpec>} */
export const EXAM_STATUS = Object.freeze({
  draft: { symbol: '○', label: 'Draft', tone: 'neutral' },
  published: { symbol: '●', label: 'Published', tone: 'focus' },
  live: { symbol: '◐', label: 'Live now', tone: 'ok' },
  closed: { symbol: '✓', label: 'Closed', tone: 'neutral' },
})

/** @type {Record<string, ChipSpec>} */
export const ATTEMPT_STATUS = Object.freeze({
  in_progress: { symbol: '◐', label: 'In progress', tone: 'focus' },
  submitted: { symbol: '✓', label: 'Submitted', tone: 'neutral' },
  deadline: { symbol: '⏱', label: "Time's up", tone: 'neutral' },
  flag_limit: { symbol: '⚑', label: 'Ended by flags', tone: 'attention' },
  admin: { symbol: '⊘', label: 'Ended by examiner', tone: 'attention' },
})

/** @type {Record<string, ChipSpec>} */
export const REVIEW_STATUS = Object.freeze({
  pending: { symbol: '·', label: 'Pending', tone: 'neutral' },
  cleared: { symbol: '✓', label: 'Cleared', tone: 'ok' },
  suspicious: { symbol: '?', label: 'Suspicious', tone: 'attention' },
  disqualified: { symbol: '✕', label: 'Disqualified', tone: 'critical' },
})

/** @type {Record<string, ChipSpec>} */
export const RESULT_STATUS = Object.freeze({
  not_available: { symbol: '○', label: 'Not available', tone: 'neutral' },
  held: { symbol: '⏸', label: 'Held', tone: 'attention' },
  visible: { symbol: '●', label: 'Visible', tone: 'ok' },
})
