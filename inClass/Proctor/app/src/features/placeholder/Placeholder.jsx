// Stand-in for screens built in later phases. Labelled with the SCREENS.md id so it's obvious what goes here.
import { Construction } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState.jsx'
import styles from './Placeholder.module.css'

/**
 * @param {{ screen: string, title: string, phase: number, quiet?: boolean }} props
 *   quiet: full-window "quiet room" screens (pre-test, exam) that have no sidebar.
 */
export function Placeholder({ screen, title, phase, quiet = false }) {
  const body = (
    <EmptyState icon={Construction} title={`${screen} · ${title}`}>
      This screen is built in Phase {phase}. See SCREENS.md {screen}.
    </EmptyState>
  )
  if (!quiet) {
    return (
      <section className={styles.page} aria-label={`${screen} ${title}`}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.box}>{body}</div>
      </section>
    )
  }
  return (
    <div className={styles.quiet}>
      <div className={`drag-region ${styles.titlebar}`} />
      <div className={styles.center}>
        <div className={styles.box}>{body}</div>
      </div>
    </div>
  )
}
