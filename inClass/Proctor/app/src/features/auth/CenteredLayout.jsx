// The window layout for S1/S2: drag strip on top, one centred card, an optional footer line.
import styles from './CenteredLayout.module.css'

export function CenteredLayout({ children, footer }) {
  return (
    <div className={styles.layout}>
      <div className={`drag-region ${styles.titlebar}`} />
      <main className={styles.center}>{children}</main>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  )
}
