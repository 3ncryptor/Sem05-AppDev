// Pure helpers for A10: capture filtering and labels, and plain-text answers for every question type.
import { letterFor } from '../../../question/letters.js'

/** Captures of one kind, oldest first. */
export const capturesOf = (captures, kind) =>
  (captures ?? []).filter((c) => c.kind === kind).toSorted((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))

const pad = (n) => String(n).padStart(2, '0')

/** 750 → "+12:30" from the attempt's start. */
function offsetText(sec) {
  if (!Number.isFinite(sec)) return ''
  const whole = Math.max(0, Math.round(sec))
  return `+${Math.floor(whole / 60)}:${pad(whole % 60)}`
}

/** "10:22:40 · +12:30" */
export function captureTimeLabel(capture) {
  const clock = new Date(capture.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const offset = offsetText(capture.offsetSec)
  return offset ? `${clock} · ${offset}` : clock
}

const optionText = (options, id) => {
  const index = options.findIndex((o) => o.id === id)
  return index < 0 ? '?' : `${letterFor(index)}. ${options[index].text}`
}

const itemText = (items, id) => items.find((item) => item.id === id)?.text ?? '?'

const pairsText = (config, pairs) =>
  config.left.map((l) => `${l.text} → ${pairs[l.id] ? itemText(config.right, pairs[l.id]) : '—'}`).join('; ')

const RESPONSE_TEXT = {
  single: (q, r) => optionText(q.config.options, r.optionId),
  multi: (q, r) => (r.optionIds.length ? r.optionIds.map((id) => optionText(q.config.options, id)).join(', ') : 'None'),
  true_false: (_q, r) => (r.value ? 'True' : 'False'),
  numeric: (_q, r) => String(r.number),
  short_text: (_q, r) => r.text || '(blank)',
  ordering: (q, r) => r.order.map((id) => itemText(q.config.items, id)).join(' → '),
  matching: (q, r) => pairsText(q.config, r.pairs),
}

const KEY_TEXT = {
  single: (q, k) => optionText(q.config.options, k.optionId),
  multi: (q, k) => k.optionIds.map((id) => optionText(q.config.options, id)).join(', '),
  true_false: (_q, k) => (k.value ? 'True' : 'False'),
  numeric: (_q, k) => (k.tolerance ? `${k.answer} (± ${k.tolerance})` : String(k.answer)),
  short_text: (_q, k) => k.accepted.join(' / '),
  ordering: (q, k) => k.order.map((id) => itemText(q.config.items, id)).join(' → '),
  matching: (q, k) => pairsText(q.config, k.pairs),
}

function safeText(table, question, value) {
  const format = table[question.type]
  if (!format || value === null || value === undefined) return null
  try {
    return format(question, value)
  } catch {
    return '(cannot show this answer)'
  }
}

export const responseText = (question) => safeText(RESPONSE_TEXT, question, question.response) ?? 'Not answered'
export const keyText = (question) => safeText(KEY_TEXT, question, question.key) ?? '—'

/** Chip spec per question result from the server: correct | partial | wrong | unanswered. */
export const RESULT_CHIP = Object.freeze({
  correct: { symbol: '✓', label: 'Correct', tone: 'ok' },
  partial: { symbol: '◐', label: 'Partly correct', tone: 'attention' },
  wrong: { symbol: '✕', label: 'Incorrect', tone: 'critical' },
  unanswered: { symbol: '○', label: 'Not answered', tone: 'neutral' },
})
