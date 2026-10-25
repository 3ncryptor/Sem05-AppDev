// Per-type data rules for the builder: the starting config/key, the editable draft (numbers kept as
// strings while typing), the payload the server expects, and the student-side config for the preview.
import { newItem } from './items.js'

const DEFAULT_MAX_CHARS = 100

/** Config and key sent when a question is created or its type changes. */
export function starterDefinition(type) {
  switch (type) {
    case 'single':
      return { config: { options: [newItem('op'), newItem('op')] }, key: { optionId: null } }
    case 'multi':
      return { config: { options: [newItem('op'), newItem('op')], scoring: 'all_or_nothing' }, key: { optionIds: [] } }
    case 'true_false':
      return { config: {}, key: { value: null } }
    case 'short_text':
      return { config: { maxChars: DEFAULT_MAX_CHARS }, key: { accepted: [], caseSensitive: false } }
    case 'numeric':
      return { config: { unit: null }, key: { answer: null, tolerance: 0 } }
    case 'ordering': {
      const items = [newItem('it'), newItem('it')]
      return { config: { items, scoring: 'positional' }, key: { order: items.map((item) => item.id) } }
    }
    case 'matching':
      return { config: { left: [], right: [] }, key: { pairs: {} } }
    default:
      return { config: {}, key: {} }
  }
}

const asText = (value) => (value === null || value === undefined ? '' : String(value))

/** '' → fallback; a real number → number; anything else is sent as-is so the server names the field. */
function asNumber(text, fallback) {
  const trimmed = String(text).trim()
  if (trimmed === '') return fallback
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : trimmed
}

function draftDefinition(question) {
  const { type, config, key } = question
  if (type === 'numeric') return { config: { unit: config.unit ?? '' }, key: { answer: asText(key.answer), tolerance: asText(key.tolerance) } }
  if (type === 'short_text') return { config: { maxChars: asText(config.maxChars) }, key }
  if (type === 'ordering') {
    const byId = new Map(config.items.map((item) => [item.id, item]))
    const ordered = (key.order ?? []).map((id) => byId.get(id)).filter(Boolean)
    const rest = config.items.filter((item) => !ordered.includes(item))
    return { config: { ...config, items: [...ordered, ...rest] }, key }
  }
  return { config, key }
}

/** The editor's working copy of a saved question. */
export function toDraft(question) {
  return {
    type: question.type,
    text: question.text ?? '',
    marks: asText(question.marks),
    topic: question.topic ?? '',
    explanation: question.explanation ?? '',
    ...draftDefinition(question),
  }
}

function payloadDefinition(draft) {
  const { type, config, key } = draft
  if (type === 'numeric') {
    return { config: { unit: config.unit }, key: { answer: asNumber(key.answer, null), tolerance: asNumber(key.tolerance, 0) } }
  }
  if (type === 'short_text') return { config: { maxChars: asNumber(config.maxChars, '') }, key }
  if (type === 'ordering') return { config, key: { order: config.items.map((item) => item.id) } }
  return { config, key }
}

/** Body for admin.questions.update. The type is never sent here; changing it is its own call. */
export function toPayload(draft) {
  return {
    text: draft.text,
    marks: asNumber(draft.marks, ''),
    topic: draft.topic,
    explanation: draft.explanation,
    ...payloadDefinition(draft),
  }
}

/** What QuestionView needs, built from the draft so the preview follows typing. */
export function previewQuestion(id, draft) {
  const { type, config, key } = draft
  const previewConfig = {
    single: () => ({ options: config.options }),
    multi: () => ({ options: config.options }),
    true_false: () => ({}),
    short_text: () => ({ maxChars: Number(config.maxChars) || DEFAULT_MAX_CHARS, caseSensitive: key.caseSensitive }),
    numeric: () => ({ unit: config.unit || null }),
    ordering: () => ({ items: config.items }),
    matching: () => ({ left: config.left, right: config.right }),
  }[type]
  return { id, type, text: draft.text, marks: Number(draft.marks) || 0, config: previewConfig ? previewConfig() : {} }
}
