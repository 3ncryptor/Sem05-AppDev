// Settings (S3) is shared: it renders inside whichever shell the signed-in role uses.
import { useAuth } from '../auth/useAuth.js'
import { AdminShell } from './AdminShell.jsx'
import { StudentShell } from './StudentShell.jsx'

export function RoleShell() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminShell /> : <StudentShell />
}
