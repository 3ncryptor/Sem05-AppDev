// Like useApi, but for local IPC calls that aren't server routes (app:info, server:get, evidence:summary).
import { useCallback, useEffect, useState } from 'react'

/** @template T @param {() => Promise<T>} load  must be stable (define it outside the component) */
export function useLocal(load) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let cancelled = false
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
  }, [load, reloads])

  const reload = useCallback(() => setReloads((count) => count + 1), [])
  return { ...state, reload }
}
