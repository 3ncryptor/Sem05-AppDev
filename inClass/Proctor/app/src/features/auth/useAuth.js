import { useContext } from 'react'
import { AuthContext } from './authContext.js'

/** @returns {import('./authContext.js').AuthValue} */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
