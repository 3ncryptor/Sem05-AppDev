import styles from './Misc.module.css'

/** LABEL over a big value, used in dashboards' overview rows. */
export function StatTile({ label, value, detail }) {
  return (
    <div className={styles.tile}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={styles.tileValue}>{value}</p>
      {detail && <p className={styles.tileDetail}>{detail}</p>}
    </div>
  )
}
