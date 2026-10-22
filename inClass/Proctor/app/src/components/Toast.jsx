// Toasts, bottom centre (SCREENS §0.3). Announced politely to screen readers; they never steal focus.
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext } from './toastContext.js'
import styles from './Toast.module.css'

const DEFAULT_DURATION_MS = 4000
const MAX_VISIBLE = 3
const ICONS = { neutral: Info, ok: CircleCheck, attention: TriangleAlert, critical: CircleAlert }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const show = useCallback(
    (message, { tone = 'neutral', durationMs = DEFAULT_DURATION_MS } = {}) => {
      nextId.current += 1
      const id = nextId.current
      setToasts((list) => [...list, { id, message, tone }].slice(-MAX_VISIBLE))
      timers.current.set(id, setTimeout(() => dismiss(id), durationMs))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] ?? Info
          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext>
  )
}
