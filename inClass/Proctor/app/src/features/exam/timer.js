// C11 timer: the server's deadline, shown gently. No seconds until the last 5 minutes (BUILD_PLAN §5.1).
import { useEffect, useState } from 'react'

const MINUTE = 60_000
export const THRESHOLDS = Object.freeze({ attention: 10 * MINUTE, seconds: 5 * MINUTE, critical: MINUTE })

/** Re-renders every second and returns ms left on the server clock (deadline − (now + offset)). */
export function useTimeLeft(deadlineAt, offsetMs) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!deadlineAt) return null
  return Math.max(0, Date.parse(deadlineAt) - (now + offsetMs))
}

/** { text, tone } for the status bar. */
export function timerDisplay(msLeft) {
  if (msLeft === null) return { text: '…', tone: 'normal' }
  if (msLeft <= 0) return { text: 'Time’s up', tone: 'critical' }
  if (msLeft > THRESHOLDS.seconds) {
    const minutes = Math.ceil(msLeft / MINUTE)
    return { text: `${minutes} min left`, tone: msLeft <= THRESHOLDS.attention ? 'attention' : 'normal' }
  }
  const totalSeconds = Math.ceil(msLeft / 1000)
  const text = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
  return { text, tone: msLeft <= THRESHOLDS.critical ? 'critical' : 'attentionBold' }
}
