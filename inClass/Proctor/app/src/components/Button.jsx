// Button (SCREENS §0.3): primary / secondary / ghost / danger. One primary per screen (BUILD_PLAN §6.1).
import styles from './Button.module.css'

/**
 * @param {{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'md' | 'lg', icon?: import('react').ElementType,
 *           loading?: boolean, block?: boolean } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({ variant = 'secondary', size = 'md', icon: Icon, loading = false, block = false, className = '', children, disabled, type = 'button', ...rest }) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className].join(' ')
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  )
}
