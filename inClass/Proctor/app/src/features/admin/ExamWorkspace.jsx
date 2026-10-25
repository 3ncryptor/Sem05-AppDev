// A0 exam workspace: header (name, code, status chip, one primary action) + the seven tabs.
// Publish / unpublish go through the A7 dialog; tabs get { exam, refetch } through the Outlet context.
import { RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { Tabs } from '../../components/Tabs.jsx'
import { errorMessage } from '../../lib/api.js'
import { EXAM_STATUS } from '../../lib/status.js'
import { useApi } from '../../lib/useApi.js'
import { PublishDialog } from './exams/PublishDialog.jsx'
import { useExamTitles } from '../shell/examTitles.js'
import { examStatusKey, primaryAction } from './examStatus.js'
import styles from './ExamWorkspace.module.css'

function tabItems(base, counts) {
  return [
    { to: base, label: 'Overview', end: true },
    { to: `${base}/questions`, label: 'Questions' },
    { to: `${base}/settings`, label: 'Settings' },
    { to: `${base}/live`, label: 'Live', dot: (counts?.inProgress ?? 0) > 0 },
    { to: `${base}/review`, label: 'Review', badge: counts?.pendingReview ?? 0 },
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
  const navigate = useNavigate()
  const [actionOpen, setActionOpen] = useState(false)
  const exam = data?.exam ?? data
  const counts = exam?.counts

  useEffect(() => {
    if (exam?.title) setTitle(examId, exam.title)
  }, [exam?.title, examId, setTitle])

  const base = `/admin/exams/${examId}`
  const statusKey = examStatusKey(exam)
  const action = exam ? primaryAction(exam, statusKey) : null
  const writing = counts?.inProgress ?? 0
  const closeAction = () => setActionOpen(false)
  const onAction = () => (action.kind === 'results' ? navigate(`${base}/results`) : setActionOpen(true))
  const afterAction = () => {
    setActionOpen(false)
    refetch()
  }

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
              <Button variant={action.variant} onClick={onAction}>
                {action.label}
              </Button>
            )}
          </div>
        </header>
      )}
      <Tabs label="Exam sections" items={tabItems(base, counts)} />
      <div className={styles.tabBody}>
        <Outlet context={{ exam, refetch }} />
      </div>
      {actionOpen && action && action.kind !== 'results' && (
        <PublishDialog examId={examId} mode={action.kind} onClose={closeAction} onDone={afterAction} />
      )}
    </div>
  )
}
