// Main → renderer events for the exam room (BUILD_PLAN §17.3). Each becomes a reducer action;
// a few also show a toast or move to the done page.
import { useEffect } from 'react'

const MINUTE_MS = 60_000

export function useMainEvents({ attemptId, dispatch, stateRef, toast, navigate }) {
  useEffect(() => {
    const athena = window.athena
    if (!athena) return undefined

    const offHeartbeat = athena.exam.on('exam:heartbeat', (beat) => {
      const before = stateRef.current.deadlineAt
      dispatch({ type: 'HEARTBEAT', ...beat })
      const added = before && beat.deadlineAt ? Math.round((Date.parse(beat.deadlineAt) - Date.parse(before)) / MINUTE_MS) : 0
      if (added > 0) toast(`Your examiner added ${added} minute${added === 1 ? '' : 's'}.`)
    })
    const offForced = athena.exam.on('exam:forced', ({ submitReason }) => {
      dispatch({ type: 'FORCED', submitReason })
      navigate(`/student/attempts/${attemptId}/done`, { replace: true })
    })
    const offWarning = athena.exam.on('exam:warning', (warning) => dispatch({ type: 'WARNING', warning }))
    const offSensor = athena.exam.on('exam:sensor', (sensors) => dispatch({ type: 'SENSOR', sensors }))
    // "Back online" waits until the kept answers have actually been sent.
    let reconnecting = false
    const offNet = athena.net.onStatus((status) => {
      if (!stateRef.current.net.online && status.online) reconnecting = true
      dispatch({ type: 'NET', ...status })
      if (reconnecting && status.online && status.queued === 0) {
        reconnecting = false
        toast('Back online. Everything is saved.', { tone: 'ok' })
      }
    })

    return () => [offHeartbeat, offForced, offWarning, offSensor, offNet].forEach((off) => off())
  }, [attemptId, dispatch, stateRef, toast, navigate])
}
