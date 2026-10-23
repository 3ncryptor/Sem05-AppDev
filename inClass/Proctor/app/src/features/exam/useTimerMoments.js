// The one-off moments of C11: a toast at 10 and 5 minutes. Each fires once per attempt.
import { useEffect, useRef } from 'react'
import { THRESHOLDS } from './timer.js'

export function useTimerMoments(msLeft, toast) {
  const fired = useRef({})
  useEffect(() => {
    if (msLeft === null || msLeft <= 0) return
    const moments = [
      { id: 'ten', at: THRESHOLDS.attention, text: '10 minutes left' },
      { id: 'five', at: THRESHOLDS.seconds, text: '5 minutes left' },
    ]
    for (const moment of moments) {
      // Only when crossing the line during the exam, not on a resume that's already past it.
      if (msLeft <= moment.at && msLeft > moment.at - 5000 && !fired.current[moment.id]) {
        fired.current[moment.id] = true
        toast(moment.text, { tone: 'attention' })
      }
    }
  }, [msLeft, toast])
}
