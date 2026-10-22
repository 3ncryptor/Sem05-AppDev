import styles from './BrandMark.module.css'

/** "▰ Athena": the app's mark. Pure CSS, so nothing to ship and it follows the theme. */
export function BrandMark({ size = 'md', showName = true }) {
  return (
    <span className={`${styles.brand} ${styles[size]}`}>
      <span className={styles.mark} aria-hidden="true" />
      {showName && <span className={styles.name}>Athena</span>}
    </span>
  )
}
