// The small "Saving… / Saved ✓ / Not saved" line under the editor.
import styles from './Builder.module.css'

const TEXT = { pending: 'Unsaved changes…', saving: 'Saving…', saved: 'Saved ✓', error: 'Not saved' }

export function SaveStatus({ status }) {
  if (status === 'idle') return null
  return (
    <p className={`${styles.saveStatus} ${status === 'error' ? styles.saveError : ''}`} role="status">
      {TEXT[status]}
    </p>
  )
}
