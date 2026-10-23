// C4 copy, generated from the exam's own config, so the rules shown are exactly the rules enforced.
// Rules that are off aren't listed; with proctoring off only "How the exam works" and the terms show.

export function examRules(exam) {
  const proctoring = exam.proctoring ?? {}
  if (!proctoring.enabled) return []
  const rules = proctoring.rules ?? {}
  return [
    rules.fullscreen?.on && { icon: 'fullscreen', text: 'Stay in fullscreen.' },
    rules.focus?.on && { icon: 'switch', text: 'Don’t switch apps (even a quick look counts).' },
    (rules.noFace?.on || rules.multiFace?.on) && { icon: 'face', text: 'Stay in view of the camera, alone.' },
    (rules.displays?.on || proctoring.blockMultipleDisplays) && { icon: 'display', text: 'One display only.' },
    rules.clipboard?.on && rules.clipboard?.blockCopyPaste && { icon: 'clipboard', text: 'Copy and paste are turned off.' },
  ].filter(Boolean)
}

export function flagLines(exam) {
  const autoEnd = exam.proctoring?.autoEnd
  const limit = autoEnd?.enabled ? `At ${autoEnd.maxFlags} flags your exam ends automatically.` : 'Flags never end the exam on their own.'
  return ['Breaking a rule is a flag. You’ll see a warning each time.', limit, 'A person reviews every flag; the software doesn’t decide.']
}

export const CAPTURE_ITEMS = [
  { id: 'camera', label: 'Photos from your camera, at random times and at flags' },
  { id: 'screen', label: 'Pictures of your screen, at random times and at flags' },
  { id: 'events', label: 'Events such as leaving fullscreen or switching apps' },
]
