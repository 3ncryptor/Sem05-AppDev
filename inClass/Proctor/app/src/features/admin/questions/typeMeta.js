// Names, outline symbols and picker hints for the seven question types (SCREENS §A4, §A4a).

export const TYPE_ORDER = Object.freeze(['single', 'multi', 'true_false', 'short_text', 'numeric', 'ordering', 'matching'])

export const TYPE_META = Object.freeze({
  single: { label: 'Single choice', symbol: '◉', hint: 'Pick one option' },
  multi: { label: 'Multiple select', symbol: '☑', hint: 'Pick all that apply' },
  true_false: { label: 'True / false', symbol: '⊤', hint: 'One statement' },
  short_text: { label: 'Short answer', symbol: '✎', hint: 'Type a word or command' },
  numeric: { label: 'Number', symbol: '#', hint: 'Type a number' },
  ordering: { label: 'Put in order', symbol: '⇅', hint: 'Arrange steps' },
  matching: { label: 'Match pairs', symbol: '⇄', hint: 'Connect two columns' },
})

export const typeLabel = (type) => TYPE_META[type]?.label ?? type

/** First line of the question without code blocks, for the outline. */
export function stemOf(text) {
  const line = (text ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim()
  return line || '(no text yet)'
}
