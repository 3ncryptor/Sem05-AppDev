import styles from './Misc.module.css'

/**
 * Empty state (DESIGN.md): a 40 px sunk square holding a 20 px icon, a title, one sentence, at most one action.
 * @param {{ icon?: import('react').ElementType, title?: import('react').ReactNode, children?: import('react').ReactNode,
 *           action?: import('react').ReactNode }} props
 */
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className={styles.empty}>
      {Icon && (
        <span className={styles.emptyIcon} aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      {title && <p className={styles.emptyTitle}>{title}</p>}
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  )
}
