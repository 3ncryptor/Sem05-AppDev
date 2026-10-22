// A0 exam workspace: header (name, code, status chip, one primary action) + the eight tabs.
// Tab contents are later phases; this phase builds the frame they live in.
import { RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { Dialog } from '../../components/Dialog.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { Tabs } from '../../components/Tabs.jsx'
import { errorMessage } from '../../lib/api.js'
import { EXAM_STATUS } from '../../lib/status.js'
import { useApi } from '../../lib/useApi.js'
import { useExamTitles } from '../shell/examTitles.js'
import { examStatusKey, primaryAction } from './examStatus.js'
import styles from './ExamWorkspace.module.css'

function tabItems(base, summary) {
  return [
    { to: base, label: 'Overview', end: true },
    { to: `${base}/questions`, label: 'Questions' },
    { to: `${base}/settings`, label: 'Settings' },
    { to: `${base}/proctoring`, label: 'Proctoring' },
    { to: `${base}/live`, label: 'Live', dot: (summary?.inProgress ?? 0) > 0 },
    { to: `${base}/review`, label: 'Review', badge: summary?.pendingReviews ?? 0 },
    { to: `${base}/results`, label: 'Results' },
    { to: `${base}/analytics`, label: 'Analytics' },
  ]
}

function metaLine(exam) {
  const parts = [
    exam.code,
    exam.durationMinutes ? `${exam.durationMinutes} min` : null,
    Number.isInteger(exam.questionCount ?? exam.questions?.length) ? `${exam.questionCount ?? exam.questions.length} questions` : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

function HeaderSkeleton() {
  return (
    <div className={styles.header} aria-busy="true">
      <div className={styles.titleBlock}>
        <Skeleton width={240} height={26} />
        <Skeleton width={180} height={14} />
      </div>
    </div>
  )
}

export function ExamWorkspace() {
  const { examId } = useParams()
  const { data, error, loading, refetch } = useApi('admin.exams.get', { examId })
  const { setTitle } = useExamTitles()
  const [actionOpen, setActionOpen] = useState(false)
  const exam = data?.exam ?? data
  const summary = data?.summary ?? exam?.summary

  useEffect(() => {
    if (exam?.title) setTitle(examId, exam.title)
  }, [exam?.title, examId, setTitle])

  const base = `/admin/exams/${examId}`
  const statusKey = examStatusKey(exam)
  const action = exam ? primaryAction(exam, statusKey) : null
  const writing = summary?.inProgress ?? 0

  return (
    <div className={styles.workspace}>
      {loading && !exam && <HeaderSkeleton />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {exam && (
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{exam.title}</h1>
            <p className={styles.meta}>{metaLine(exam)}</p>
          </div>
          <div className={styles.actions}>
            <Chip spec={EXAM_STATUS[statusKey]} pulse={statusKey === 'live'}>
              {statusKey === 'live' && writing > 0 ? `Live now · ${writing} writing` : undefined}
            </Chip>
            {action && (
              <Button variant="primary" onClick={() => setActionOpen(true)}>
                {action.label}
              </Button>
            )}
          </div>
        </header>
      )}
      <Tabs label="Exam sections" items={tabItems(base, summary)} />
      <div className={styles.tabBody}>
        <Outlet />
      </div>
      <Dialog
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={action?.label.replace('…', '') ?? ''}
        description={action?.label === 'Publish…' ? 'A7 · Publish checklist, built in Phase 6.' : 'A11a · Publish results, built in Phase 8.'}
        footer={<Button onClick={() => setActionOpen(false)}>Close</Button>}
      />
    </div>
  )
}
