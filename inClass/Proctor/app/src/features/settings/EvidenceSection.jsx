import { FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '../../components/Button.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { useToast } from '../../components/toastContext.js'
import { ipc } from '../../lib/api.js'
import { formatBytes, tildePath } from '../../lib/format.js'
import { useLocal } from '../../lib/useLocal.js'
import { Row, Section } from './Section.jsx'
import styles from './Settings.module.css'

const loadSummary = () => ipc.evidenceSummary()

function storedLine({ attempts, bytes, pending }) {
  const upload = pending === 0 ? 'all uploaded ✓' : `${pending} waiting to upload`
  return `${attempts} attempt${attempts === 1 ? '' : 's'} · ${formatBytes(bytes)} · ${upload}`
}

/** Students only: the local-first evidence folder (BUILD_PLAN §4). */
export function EvidenceSection() {
  const { data, error, reload } = useLocal(loadSummary)
  const toast = useToast()

  const onOpen = () => ipc.evidenceOpenFolder().catch(() => toast("Couldn't open the folder.", { tone: 'critical' }))
  const onDelete = async () => {
    try {
      const result = await ipc.evidenceDeleteLocal()
      if (!result) return
      toast(`Deleted ${result.deleted} · kept ${result.kept} (not submitted or not uploaded yet).`)
      reload()
    } catch {
      toast("Couldn't delete local evidence.", { tone: 'critical' })
    }
  }

  return (
    <Section title="Evidence on this Mac">
      <Row label="Folder">
        <div className={styles.stack}>
          <span className="mono">{data ? tildePath(data.folder) : <Skeleton width={320} />}</span>
          <div>
            <Button icon={FolderOpen} onClick={onOpen}>
              Show in Finder
            </Button>
          </div>
        </div>
      </Row>
      <Row label="Stored">
        <div className={styles.stack}>
          <span>{data ? storedLine(data) : error ? 'Unavailable' : <Skeleton width={220} />}</span>
          <div>
            <Button icon={Trash2} onClick={onDelete} disabled={!data || data.attempts === 0}>
              Delete local evidence…
            </Button>
          </div>
        </div>
      </Row>
    </Section>
  )
}
