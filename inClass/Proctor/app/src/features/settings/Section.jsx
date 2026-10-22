import { useId } from 'react'
import styles from './Settings.module.css'

/** An uppercase section heading and its rows. */
export function Section({ title, note, children }) {
  const id = useId()
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
        {note && <span className={styles.note}>{note}</span>}
      </h2>
      <div className={styles.rows}>{children}</div>
    </section>
  )
}

/** Label column + content column, like System Settings. */
export function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{label}</div>
      <div className={styles.rowBody}>{children}</div>
    </div>
  )
}
