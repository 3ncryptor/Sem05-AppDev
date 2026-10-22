// Admin shell (SCREENS A0): collapsible sidebar (Home, Exams, Students, Settings) and breadcrumbs in the title bar.
import { ClipboardList, House, Settings, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { Breadcrumbs } from './Breadcrumbs.jsx'
import { ExamTitlesContext } from './examTitles.js'
import { Sidebar } from './Sidebar.jsx'
import styles from './Shell.module.css'

const NAV = [
  { to: '/admin', label: 'Home', icon: House, end: true },
  { to: '/admin/exams', label: 'Exams', icon: ClipboardList },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AdminShell() {
  const [titles, setTitles] = useState({})
  const setTitle = useCallback((id, title) => {
    setTitles((current) => (current[id] === title ? current : { ...current, [id]: title }))
  }, [])
  const titlesValue = useMemo(() => ({ titles, setTitle }), [titles, setTitle])

  return (
    <ExamTitlesContext value={titlesValue}>
      <div className={styles.shell}>
        <Sidebar items={NAV} roleLabel="ADMIN" collapsible />
        <div className={styles.main}>
          <div className={`drag-region ${styles.titlebar}`}>
            <Breadcrumbs />
          </div>
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </ExamTitlesContext>
  )
}
