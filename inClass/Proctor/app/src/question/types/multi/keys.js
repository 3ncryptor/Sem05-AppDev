// 1–9 shortcut for multi: key n toggles option n.
import { ordered, toggle } from './selection.js'

export function multiKey(question, response, n) {
  const option = question.config.options[n - 1]
  if (!option) return undefined
  const next = ordered(question, toggle(response?.optionIds ?? [], option.id))
  return next.length ? { optionIds: next } : null
}
