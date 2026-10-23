// What each exam card shows and does, by `myStatus` (SCREENS C1). Pure, so it's easy to walk through.
import { formatWhen, minutesLeft, plural } from '../../lib/format.js'

/** @type {Record<string, import('../../lib/status.js').ChipSpec>} */
export const MY_STATUS = Object.freeze({
  open: { symbol: '●', label: 'Open', tone: 'focus' },
  upcoming: { symbol: '○', label: 'Upcoming', tone: 'neutral' },
  in_progress: { symbol: '◐', label: 'In progress', tone: 'attention' },
  submitted: { symbol: '✓', label: 'Submitted', tone: 'ok' },
  closed: { symbol: '✓', label: 'Closed', tone: 'neutral' },
})

/** Filter chips: All · Open · Upcoming · Done. */
export const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'open', label: 'Open', match: (e) => e.myStatus === 'open' || e.myStatus === 'in_progress' },
  { id: 'upcoming', label: 'Upcoming', match: (e) => e.myStatus === 'upcoming' },
  { id: 'done', label: 'Done', match: (e) => e.myStatus === 'submitted' || e.myStatus === 'closed' },
]

/** Second and third lines of the card. */
export function cardLines(exam) {
  const size = `${plural(exam.questionCount, 'question')} · ${exam.durationMinutes} min`
  switch (exam.myStatus) {
    case 'open':
      return [size, `Closes ${formatWhen(exam.closesAt)}`, `${plural(exam.attemptsLeft, 'attempt')} left`]
    case 'upcoming':
      return [size, `Opens ${formatWhen(exam.opensAt)}`]
    case 'in_progress':
      return [size, `${minutesLeft(exam.deadlineAt)} min left`]
    case 'submitted': {
      const percent = exam.lastPercent === null || exam.lastPercent === undefined ? '' : ` · ${Math.round(exam.lastPercent)}%`
      return [size, `Submitted ${formatWhen(exam.submittedAt)}${percent}`]
    }
    default:
      return [size, `Closed ${formatWhen(exam.closesAt)}`]
  }
}

/** The card's one action: { label, to } or null. */
export function cardAction(exam) {
  switch (exam.myStatus) {
    case 'open':
    case 'upcoming':
      return { label: 'View exam', to: `/student/exams/${exam.id}` }
    case 'in_progress':
      return { label: 'Resume', to: `/student/attempts/${exam.openAttemptId}/resume`, primary: true }
    case 'submitted':
      if (!exam.lastAttemptId) return null
      return exam.resultVisible
        ? { label: 'See result', to: `/student/results/${exam.lastAttemptId}` }
        : { label: 'View receipt', to: `/student/attempts/${exam.lastAttemptId}/done` }
    default:
      return null
  }
}
