// Autosave for the question editor (SCREENS §A4: 800 ms after typing stops). Saves run one after
// another, a pending save is sent when the editor closes, and field errors from the server are kept.
import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../../lib/api.js'

export const AUTOSAVE_MS = 800

const IDLE = { status: 'idle', fields: {}, message: null }

/**
 * @param {(payload: object) => Promise<unknown>} save
 * @returns {{ status: 'idle' | 'pending' | 'saving' | 'saved' | 'error', fields: Record<string, string>,
 *             message: string | null, schedule: (payload: object) => void, saveNow: (payload: object) => Promise<boolean> }}
 */
export function useAutosave(save) {
  const [state, setState] = useState(IDLE)
  const saveRef = useRef(save)
  const timer = useRef(null)
  const pending = useRef(null)
  const chain = useRef(Promise.resolve())

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const enqueue = useCallback((payload) => {
    const run = async () => {
      setState((current) => ({ ...current, status: 'saving' }))
      try {
        await saveRef.current(payload)
        setState({ status: 'saved', fields: {}, message: null })
        return true
      } catch (error) {
        setState({ status: 'error', fields: error?.fields ?? {}, message: errorMessage(error) })
        return false
      }
    }
    const next = chain.current.then(run)
    chain.current = next
    return next
  }, [])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const payload = pending.current
    pending.current = null
    if (payload) enqueue(payload)
  }, [enqueue])

  const schedule = useCallback(
    (payload) => {
      pending.current = payload
      setState((current) => ({ ...current, status: 'pending' }))
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, AUTOSAVE_MS)
    },
    [flush],
  )

  /** Drops any waiting autosave and sends `payload` right away (used for type changes). */
  const saveNow = useCallback(
    (payload) => {
      clearTimeout(timer.current)
      pending.current = null
      return enqueue(payload)
    },
    [enqueue],
  )

  useEffect(() => flush, [flush])

  return { ...state, schedule, saveNow }
}
