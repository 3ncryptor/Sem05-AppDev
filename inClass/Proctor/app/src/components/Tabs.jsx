// Route tabs: each tab is a link to a sub-route, so Back/Forward and deep links work.
// Uses <nav> + aria-current rather than role="tablist", because these navigate between pages.
import { NavLink } from 'react-router'
import styles from './Tabs.module.css'

/**
 * @param {{ label: string, items: { to: string, label: string, end?: boolean, badge?: number, dot?: boolean }[] }} props
 */
export function Tabs({ label, items }) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
          {item.label}
          {item.dot && (
            <span className={styles.dot}>
              <span className="visually-hidden">(active)</span>
            </span>
          )}
          {item.badge > 0 && <span className={styles.badge}>{item.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
