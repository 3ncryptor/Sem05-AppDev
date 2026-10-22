import { useCallback, useState } from 'react'
import { logProctorEvent } from '../api/examApi'

/**
 * Tracks proctoring events (camera snapshots, fullscreen exits, tab switches)
 * locally for display and, when a session exists, syncs them to the backend.
 */
export function useProctorLog() {
  const [events, setEvents] = useState([])

  const addProctorEvent = useCallback((sessionId, type, message, meta = {}) => {
    const event = { type, message, meta, occurredAt: new Date().toISOString() }
    setEvents((prev) => [...prev, event])

    if (sessionId) {
      logProctorEvent({ sessionId, type, message, meta }).catch((error) => {
        console.error('Failed to sync proctor event:', error)
      })
    }
  }, [])

  return { events, addProctorEvent }
}
