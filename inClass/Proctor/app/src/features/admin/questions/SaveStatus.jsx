// The small "Saving… / Saved / Not saved" status in the editor header.
import styles from './Builder.module.css'

const TEXT = { pending: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Not saved' }
const TONE = { saved: styles.saveSaved, error: styles.saveError }

export function SaveStatus({ status }) {
  if (status === 'idle') return null
  return (
    <p className={`${styles.saveStatus} ${TONE[status] ?? ''}`} role="status">
      {TEXT[status]}
    </p>
  )
}
