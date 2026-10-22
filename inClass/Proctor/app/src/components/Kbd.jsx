import styles from './Misc.module.css'

/** A keyboard key hint, e.g. <Kbd>N</Kbd>. */
export function Kbd({ children }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}
