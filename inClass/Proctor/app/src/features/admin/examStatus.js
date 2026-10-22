// Works out which chip and which single primary action the exam header shows (SCREENS A0, BUILD_PLAN §6.1).

/** draft / published / live / closed, from the stored status and the open–close window. */
export function examStatusKey(exam, now = Date.now()) {
  if (!exam || exam.status === 'draft') return 'draft'
  const opens = exam.opensAt ? Date.parse(exam.opensAt) : null
  const closes = exam.closesAt ? Date.parse(exam.closesAt) : null
  if (closes !== null && now > closes) return 'closed'
  if (opens !== null && now >= opens) return 'live'
  return 'published'
}

/** @returns {{ label: string } | null} draft → Publish…; live/closed with "when I publish" → Publish results… */
export function primaryAction(exam, statusKey) {
  if (statusKey === 'draft') return { label: 'Publish…' }
  const waitsForPublish = exam?.resultPolicy?.visibility === 'after_publish'
  if ((statusKey === 'live' || statusKey === 'closed') && waitsForPublish && !exam?.resultsPublishedAt) {
    return { label: 'Publish results…' }
  }
  return null
}
