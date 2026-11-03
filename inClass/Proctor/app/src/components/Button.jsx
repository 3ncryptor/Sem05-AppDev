// Button (DESIGN.md): primary / secondary / ghost / danger / dangerSolid. One primary per view.
// `danger` is the outlined secondary shape in critical text; inside a Dialog footer it fills automatically,
// because there it is the confirmed destructive action. `dangerSolid` forces the fill anywhere else.
import styles from './Button.module.css'

/**
 * @param {{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid', size?: 'md' | 'lg', icon?: import('react').ElementType,
 *           loading?: boolean, block?: boolean } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({ variant = 'secondary', size = 'md', icon: Icon, loading = false, block = false, className = '', children, disabled, type = 'button', ...rest }) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} data-variant={variant} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  )
}
