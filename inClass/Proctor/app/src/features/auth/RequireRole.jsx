// Route guard (SCREENS route table): not signed in → S1, wrong role → that role's home, no server → S2.
// It only keeps the UI tidy; the server enforces the same rules on every request.
import { Navigate, useLocation } from 'react-router'
import { homeFor } from './authContext.js'
import { useAuth } from './useAuth.js'
import { LaunchScreen } from './LaunchScreen.jsx'

/** @param {{ role: 'student' | 'admin' | 'any', children: import('react').ReactNode }} props */
export function RequireRole({ role, children }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LaunchScreen />
  if (status === 'unreachable') return <Navigate to="/server" replace state={{ from: location.pathname }} />
  if (status !== 'signedIn' || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role !== 'any' && user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return children
}

/** `/` and unknown routes: send everyone to the right place. */
export function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <LaunchScreen />
  if (status === 'unreachable') return <Navigate to="/server" replace state={{ from: '/' }} />
  if (status !== 'signedIn' || !user) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user.role)} replace />
}
