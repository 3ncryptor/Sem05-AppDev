// Label + control + hint/error, shared by Input, Textarea and Select so every form field looks the same.
import { CircleAlert } from 'lucide-react'
import styles from './Field.module.css'

/**
 * @param {{ id: string, label?: string, hint?: string, error?: string | null, hideLabel?: boolean, children: import('react').ReactNode }} props
 */
export function Field({ id, label, hint, error, hideLabel = false, children }) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}
