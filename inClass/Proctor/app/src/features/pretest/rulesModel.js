// C4 copy, generated from the exam's own config, so the rules shown are exactly the rules enforced.
// Only copy-paste blocking is enforced now; nothing is flagged. With proctoring off only the terms show.

export function examRules(exam) {
  const proctoring = exam.proctoring ?? {}
  if (!proctoring.enabled) return []
  const rules = proctoring.rules ?? {}
  return [
    rules.clipboard?.on && rules.clipboard?.blockCopyPaste && { icon: 'clipboard', text: 'Copy and paste are turned off.' },
  ].filter(Boolean)
}

export const CAPTURE_ITEMS = [
  { id: 'camera', label: 'Photos from your camera, about once a minute' },
  { id: 'screen', label: 'Screenshots of the Athena window, about once a minute' },
  { id: 'events', label: 'Your answers and when you saved them' },
]
