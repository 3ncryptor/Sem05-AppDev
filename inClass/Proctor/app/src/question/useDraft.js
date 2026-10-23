// Text and number answers: keep what's typed locally, and commit it 600 ms after typing stops (or on blur).
// That sends one save per pause instead of one per keystroke; the queue would collapse them anyway.
import { useEffect, useRef, useState } from 'react'

const COMMIT_DELAY_MS = 600

/** @param {string} initial @param {(value: string) => void} commit */
export function useDraft(initial, commit) {
  const [draft, setDraft] = useState(initial)
  const timer = useRef(null)
  const latest = useRef({ draft: initial, committed: initial, commit })

  useEffect(() => {
    latest.current.commit = commit
  }, [commit])

  const flush = () => {
    clearTimeout(timer.current)
    const { draft: value, committed } = latest.current
    if (value === committed) return
    latest.current.committed = value
    latest.current.commit(value)
  }

  const change = (value) => {
    setDraft(value)
    latest.current.draft = value
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, COMMIT_DELAY_MS)
  }

  // Leaving the question commits whatever was typed.
  useEffect(() => () => flush(), [])

  return { draft, change, flush }
}
