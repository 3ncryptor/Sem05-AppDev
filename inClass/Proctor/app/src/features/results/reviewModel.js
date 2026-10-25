// Pure helpers for C15: turns a review question (response + key) into rows the review card can draw.
import { letterFor } from '../../question/letters.js'

/** Per-question result from the server: an icon and a word, never colour alone. */
export const QUESTION_RESULT = Object.freeze({
  correct: { symbol: '✓', label: 'Correct' },
  partial: { symbol: '◐', label: 'Partly correct' },
  wrong: { symbol: '✕', label: 'Wrong' },
  unanswered: { symbol: '–', label: 'Not answered' },
})

export const TYPE_LABELS = Object.freeze({
  single: 'Single choice',
  multi: 'Multiple choice',
  true_false: 'True / false',
  short_text: 'Short answer',
  numeric: 'Number',
  ordering: 'Ordering',
  matching: 'Matching',
})

export const REVIEW_FILTERS = Object.freeze([
  { id: 'all', label: 'All', match: () => true },
  { id: 'wrong', label: 'Not full marks', match: (q) => q.result !== 'correct' },
  { id: 'marked', label: 'Marked', match: (q) => q.marked },
])

/** 1.3333 → 1.33, 2 → 2 */
export const formatMarks = (n) => (typeof n === 'number' ? String(Math.round(n * 100) / 100) : '—')

/** 81.3 → "81.3 %" */
export const formatPercent = (n) => (typeof n === 'number' ? `${n} %` : '—')

const textOf = (items, id) => items.find((item) => item.id === id)?.text ?? '—'

function choiceRows(options, isMine, isKey) {
  return options.map((option, index) => ({
    id: String(option.id),
    letter: letterFor(index),
    text: option.text,
    mine: isMine(option.id),
    correct: isKey(option.id),
  }))
}

/** Rows for single, multi and true/false: every option, with "your answer" and "correct" marks. */
export function optionRows(question) {
  const { type, config, key, response } = question
  if (type === 'single') {
    return choiceRows(config.options, (id) => response?.optionId === id, (id) => key?.optionId === id)
  }
  if (type === 'multi') {
    return choiceRows(config.options, (id) => Boolean(response?.optionIds?.includes(id)), (id) => Boolean(key?.optionIds?.includes(id)))
  }
  const options = [{ id: true, text: 'True' }, { id: false, text: 'False' }]
  return choiceRows(options, (value) => response?.value === value, (value) => key?.value === value)
}

/** Ordering: the student's order next to the correct order, position by position. */
export function orderingRows(question) {
  const items = question.config.items
  const mine = question.response?.order ?? []
  const correct = question.key?.order ?? []
  return correct.map((correctId, index) => ({
    position: index + 1,
    mine: mine[index] ? textOf(items, mine[index]) : '—',
    correct: textOf(items, correctId),
    inPlace: mine[index] === correctId,
  }))
}

/** Matching: each left item with the student's pick and the correct pick. */
export function matchingRows(question) {
  const { left, right } = question.config
  const mine = question.response?.pairs ?? {}
  const correct = question.key?.pairs ?? {}
  return left.map((item) => ({
    id: item.id,
    left: item.text,
    mine: mine[item.id] ? textOf(right, mine[item.id]) : '—',
    correct: textOf(right, correct[item.id]),
    right: mine[item.id] === correct[item.id],
  }))
}

/** Short answer and number: one line for the student's answer, one for what was accepted. */
export function typedAnswer(question) {
  const { type, config, key, response } = question
  if (type === 'numeric') {
    const unit = config.unit ? ` ${config.unit}` : ''
    const tolerance = key?.tolerance ? ` (± ${key.tolerance})` : ''
    return {
      mine: typeof response?.number === 'number' ? `${response.number}${unit}` : '—',
      correct: `${key?.answer ?? '—'}${unit}${tolerance}`,
    }
  }
  return {
    mine: response?.text ? response.text : '—',
    correct: (key?.accepted ?? []).join(' · ') || '—',
  }
}
