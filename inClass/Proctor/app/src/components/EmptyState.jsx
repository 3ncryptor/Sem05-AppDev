import styles from './Misc.module.css'

/** One sentence and the next action (SCREENS §0.5): "No questions yet. Add question". */
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className={styles.empty}>
      {Icon && <Icon size={24} aria-hidden="true" className={styles.emptyIcon} />}
      {title && <p className={styles.emptyTitle}>{title}</p>}
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  )
}
