import { Skeleton } from '../../components/Skeleton.jsx'
import { useLocal } from '../../lib/useLocal.js'
import { ipc } from '../../lib/api.js'
import { Row, Section } from './Section.jsx'

const loadSummary = () => ipc.evidenceSummary()

/** "3 images waiting to upload" or "All images uploaded ✓" (BUILD_PLAN §25). */
function uploadLine({ pending }) {
  if (pending === 0) return 'All images uploaded ✓'
  return `${pending} image${pending === 1 ? '' : 's'} waiting to upload`
}

/** Students only: the hidden staging area is not a folder to browse, so this is just a status line. */
export function EvidenceSection() {
  const { data, error } = useLocal(loadSummary)
  return (
    <Section title="Exam images">
      <Row label="Upload status">{data ? uploadLine(data) : error ? 'Unavailable' : <Skeleton width={220} />}</Row>
    </Section>
  )
}
