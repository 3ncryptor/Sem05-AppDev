// 1–9 shortcut for true/false: 1 = True, 2 = False.
import { CHOICES } from './choices.js'

export function trueFalseKey(_question, _response, n) {
  return n === 1 || n === 2 ? { value: CHOICES[n - 1].value } : undefined
}
