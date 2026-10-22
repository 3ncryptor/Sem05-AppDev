// The dashboard sidebar (SCREENS S3, A0): brand, nav, signed-in user and Sign out.
// The admin sidebar collapses to a 56 px icon rail; the choice is remembered per window in localStorage.
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { initials } from '../../lib/format.js'
import { useAuth } from '../auth/useAuth.js'
import { BrandMark } from './BrandMark.jsx'
import styles from './Sidebar.module.css'

const COLLAPSE_KEY = 'athena.sidebarCollapsed'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(value) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // Storage can be unavailable; the sidebar just won't remember.
  }
}

/**
 * @param {{ items: { to: string, label: string, icon: import('react').ElementType, end?: boolean }[],
 *           roleLabel?: string, collapsible?: boolean }} props
 */
export function Sidebar({ items, roleLabel, collapsible = false }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => collapsible && readCollapsed())

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    writeCollapsed(next)
  }
  const onSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} data-collapsed={collapsed}>
      <div className={`drag-region ${styles.titlebar}`}>
        {collapsible && (
          <button
            type="button"
            className={styles.collapse}
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
      <div className={styles.brand}>
        <BrandMark showName={!collapsed} />
        {roleLabel && !collapsed && <span className={styles.role}>{roleLabel}</span>}
      </div>
      <nav aria-label="Main" className={styles.nav}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <Icon size={16} aria-hidden="true" />
            <span className={collapsed ? 'visually-hidden' : ''}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.footer}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(user?.name)}
          </span>
          {!collapsed && (
            <span className={styles.who}>
              <span className={styles.name}>{user?.name}</span>
              <span className={styles.roll}>{user?.rollNo}</span>
            </span>
          )}
        </div>
        <button type="button" className={styles.link} onClick={onSignOut} title={collapsed ? 'Sign out' : undefined}>
          <LogOut size={16} aria-hidden="true" />
          <span className={collapsed ? 'visually-hidden' : ''}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
