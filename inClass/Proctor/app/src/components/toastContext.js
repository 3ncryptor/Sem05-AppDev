import { createContext, useContext } from 'react'

/** @typedef {{ tone?: 'neutral' | 'ok' | 'attention' | 'critical', durationMs?: number }} ToastOptions */

/** @type {import('react').Context<((message: string, options?: ToastOptions) => void) | null>} */
export const ToastContext = createContext(null)

/** `const toast = useToast(); toast('Saved', { tone: 'ok' })` */
export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
