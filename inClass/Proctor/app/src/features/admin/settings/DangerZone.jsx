// A5 danger zone: duplicate, unpublish (before anyone starts) and delete (drafts only).
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { DeleteExamDialog } from '../exams/DeleteExamDialog.jsx'
import { NewExamDialog } from '../exams/NewExamDialog.jsx'
import { PublishDialog } from '../exams/PublishDialog.jsx'
import styles from './Settings.module.css'

/** @param {{ exam: object, onChanged: () => void }} props */
export function DangerZone({ exam, onChanged }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(/** @type {null | 'duplicate' | 'unpublish' | 'delete'} */ (null))
  const close = () => setOpen(null)
  const canUnpublish = exam.status === 'published' && exam.counts.started === 0

  return (
    <Card>
      <h2 className={styles.section}>Danger zone</h2>
      <div className={styles.danger}>
        <Button onClick={() => setOpen('duplicate')}>Duplicate</Button>
        {canUnpublish && <Button onClick={() => setOpen('unpublish')}>Unpublish</Button>}
        {exam.status === 'draft' && (
          <Button variant="danger" onClick={() => setOpen('delete')}>
            Delete draft
          </Button>
        )}
      </div>
      {open === 'duplicate' && <NewExamDialog exams={[exam]} copyFrom={exam} onClose={close} />}
      {open === 'unpublish' && (
        <PublishDialog
          examId={exam.id}
          mode="unpublish"
          onClose={close}
          onDone={() => {
            close()
            onChanged()
          }}
        />
      )}
      {open === 'delete' && <DeleteExamDialog exam={exam} onClose={close} onDeleted={() => navigate('/admin/exams')} />}
    </Card>
  )
}
