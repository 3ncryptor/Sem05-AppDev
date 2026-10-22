// Student sidebar shell (SCREENS C1, S3): Exams, Results, Analytics, Settings.
import { ChartPie, CircleCheck, ClipboardList, Settings } from 'lucide-react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar.jsx'
import styles from './Shell.module.css'

const NAV = [
  { to: '/student/exams', label: 'Exams', icon: ClipboardList },
  { to: '/student/results', label: 'Results', icon: CircleCheck },
  { to: '/student/analytics', label: 'Analytics', icon: ChartPie },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function StudentShell() {
  return (
    <div className={styles.shell}>
      <Sidebar items={NAV} />
      <div className={styles.main}>
        <div className={`drag-region ${styles.titlebar}`} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
