// Server data hooks (BUILD_PLAN §16 State). No data-fetching library: three small hooks.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth.js'
import { api } from './api.js'

/**
 * Sends the two "global" errors where they belong: no server → S2, expired session → S1 (SCREENS §0.5).
 * Returns true if it handled the error.
 */
function useGlobalErrorRouting() {
  const navigate = useNavigate()
  const location = useLocation()
  const { markSignedOut } = useAuth()
  return useCallback(
    (error) => {
      if (error?.code === 'SERVER_UNREACHABLE') {
        navigate('/server', { state: { from: location.pathname } })
        return true
      }
      if (error?.code === 'UNAUTHENTICATED') {
        markSignedOut('expired')
        return true
      }
      return false
    },
    [navigate, location.pathname, markSignedOut],
  )
}

/**
 * Loads `name` with `params` and reloads when they change.
 * @param {string | null} name  pass null to skip (e.g. while an id isn't known yet)
 * @param {Record<string, unknown>} [params]
 */
export function useApi(name, params = {}) {
  const key = JSON.stringify(params)
  const routeError = useGlobalErrorRouting()
  const [reloads, setReloads] = useState(0)
  // Each request has a key; `loading` is simply "the last answer we have is for a different key".
  // That avoids setting state synchronously inside the effect.
  const requestKey = `${name}|${key}|${reloads}`
  const [result, setResult] = useState({ requestKey: null, data: null, error: null })

  useEffect(() => {
    if (!name) return undefined
    let cancelled = false
    api(name, JSON.parse(key))
      .then((data) => !cancelled && setResult({ requestKey, data, error: null }))
      .catch((error) => {
        if (cancelled || routeError(error)) return
        setResult({ requestKey, data: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [name, key, requestKey, routeError])

  const refetch = useCallback(() => setReloads((count) => count + 1), [])
  const loading = Boolean(name) && result.requestKey !== requestKey
  return { data: result.data, error: loading ? null : result.error, loading, refetch }
}

/**
 * For writes. `run(params)` resolves to the data or rethrows the ApiError for the caller's form.
 * @param {string} name
 */
export function useMutation(name) {
  const routeError = useGlobalErrorRouting()
  const [state, setState] = useState({ loading: false, error: null })
  const run = useCallback(
    async (params = {}) => {
      setState({ loading: true, error: null })
      try {
        const data = await api(name, params)
        setState({ loading: false, error: null })
        return data
      } catch (error) {
        setState({ loading: false, error })
        routeError(error)
        throw error
      }
    },
    [name, routeError],
  )
  return { ...state, run }
}

/**
 * Calls `fn` every `ms` while `enabled`, and skips ticks while the window is hidden.
 * @param {() => void} fn @param {number} ms @param {boolean} enabled
 */
export function usePoll(fn, ms, enabled) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  }, [fn])
  useEffect(() => {
    if (!enabled) return undefined
    const id = setInterval(() => {
      if (!document.hidden) saved.current()
    }, ms)
    return () => clearInterval(id)
  }, [ms, enabled])
}
