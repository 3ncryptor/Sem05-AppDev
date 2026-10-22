import styles from './Choice.module.css'

/** On/off toggle. A checkbox with role="switch", so it announces as on/off. */
export function Switch({ label, className = '', ...rest }) {
  return (
    <label className={`${styles.choice} ${className}`}>
      <input type="checkbox" role="switch" className={styles.input} {...rest} />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={styles.text}>{label}</span>
    </label>
  )
}
