// S3 Settings (both roles): appearance, server, evidence on this Mac (students only), about.
import { useLocal } from '../../lib/useLocal.js'
import { ipc } from '../../lib/api.js'
import { useAuth } from '../auth/useAuth.js'
import { AppearanceSection } from './AppearanceSection.jsx'
import { EvidenceSection } from './EvidenceSection.jsx'
import { ServerSection } from './ServerSection.jsx'
import { Section, Row } from './Section.jsx'
import styles from './Settings.module.css'

const loadInfo = () => ipc.appInfo()

export function SettingsPage() {
  const { user } = useAuth()
  const { data: info } = useLocal(loadInfo)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <AppearanceSection initialMode={info?.theme} />
      <ServerSection />
      {user?.role === 'student' && <EvidenceSection />}
      <Section title="About">
        <Row label="Version">
          <span className="mono">
            {info ? `Athena ${info.version} · Electron ${info.electron} · profile: ${info.profile}` : '…'}
          </span>
        </Row>
      </Section>
    </div>
  )
}
