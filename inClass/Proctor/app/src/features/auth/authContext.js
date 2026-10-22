import { createContext } from 'react'

/**
 * @typedef {{ id: string, rollNo: string, name: string, role: 'student' | 'admin' }} User
 * @typedef {'loading' | 'signedIn' | 'signedOut' | 'unreachable'} AuthStatus
 * @typedef {{
 *   status: AuthStatus, user: User | null, reason: string | null,
 *   signIn: (rollNo: string, password: string) => Promise<User>,
 *   signOut: () => Promise<void>,
 *   markSignedOut: (reason?: string) => void,
 *   refresh: () => Promise<void>,
 * }} AuthValue
 */

/** @type {import('react').Context<AuthValue | null>} */
export const AuthContext = createContext(null)

/** Where each role lands after signing in (SCREENS S1). */
export const homeFor = (role) => (role === 'admin' ? '/admin' : '/student/exams')
