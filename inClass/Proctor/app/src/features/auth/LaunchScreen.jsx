// Shown for the moment between launch and auth:me answering: just the canvas and the drag strip,
// so the window never flashes a half-built screen.
import styles from './LaunchScreen.module.css'

export function LaunchScreen() {
  return (
    <div className={styles.screen} aria-busy="true">
      <div className={`drag-region ${styles.titlebar}`} />
      <span className="visually-hidden">Loading Athena</span>
    </div>
  )
}
