// AuthContext (BUILD_PLAN §16): who is signed in, filled from auth:me on start.
// The token never reaches here; main holds it. We only ever see `{ user }`.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ipc } from '../../lib/api.js'
import { AuthContext } from './authContext.js'

const INITIAL = { status: 'loading', user: null, reason: null }

/** Turns the result (or error) of auth:me into auth state. */
async function loadSession() {
  try {
    const result = await ipc.me()
    return result?.user ? { status: 'signedIn', user: result.user, reason: null } : { status: 'signedOut', user: null, reason: null }
  } catch (error) {
    if (error?.code === 'SERVER_UNREACHABLE') return { status: 'unreachable', user: null, reason: null }
    return { status: 'signedOut', user: null, reason: null }
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL)

  const refresh = useCallback(async () => {
    setState(await loadSession())
  }, [])

  useEffect(() => {
    let cancelled = false
    loadSession().then((next) => !cancelled && setState(next))
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (rollNo, password) => {
    const { user } = await ipc.login(rollNo, password)
    setState({ status: 'signedIn', user, reason: null })
    return user
  }, [])

  const signOut = useCallback(async () => {
    // Main clears the token even if the server can't be told, so signing out always works.
    await ipc.logout().catch(() => null)
    setState({ status: 'signedOut', user: null, reason: null })
  }, [])

  const markSignedOut = useCallback((reason = null) => {
    setState({ status: 'signedOut', user: null, reason })
  }, [])

  const value = useMemo(
    () => ({ ...state, signIn, signOut, markSignedOut, refresh }),
    [state, signIn, signOut, markSignedOut, refresh],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
