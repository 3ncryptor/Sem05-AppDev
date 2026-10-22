import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import styles from './Banner.module.css'

const ICONS = { neutral: Info, focus: Info, ok: CircleCheck, attention: TriangleAlert, critical: CircleAlert }

/**
 * Full-width message with an optional action (SCREENS §0.3).
 * @param {{ tone?: 'neutral' | 'focus' | 'ok' | 'attention' | 'critical', icon?: import('react').ElementType,
 *           action?: import('react').ReactNode, role?: string, children: import('react').ReactNode }} props
 */
export function Banner({ tone = 'neutral', icon, action, role, children }) {
  const Icon = icon ?? ICONS[tone]
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={role}>
      <Icon size={16} aria-hidden="true" className={styles.icon} />
      <div className={styles.message}>{children}</div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
