// Right side of A10: one attempt's header, identity photo, and Answers / Screen / Webcam views.
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { errorMessage } from '../../../lib/api.js'
import { formatDateTime } from '../../../lib/format.js'
import { ATTEMPT_STATUS } from '../../../lib/status.js'
import { useApi } from '../../../lib/useApi.js'
import { attemptStatusKey, percentText, scoreText } from '../results/resultsModel.js'
import { AnswerList } from './AnswerList.jsx'
import { EvidenceImage } from './EvidenceImage.jsx'
import { Gallery } from './Gallery.jsx'
import { bareFileName } from './imageLoader.js'
import { capturesOf } from './reviewModel.js'
import styles from './Review.module.css'

function IdentityPhoto({ attemptId, file }) {
  if (!file) return <div className={styles.identityEmpty}>No identity photo</div>
  return <EvidenceImage eager attemptId={attemptId} kind="identity" file={bareFileName(file)} alt="Identity photo" className={styles.identity} />
}

function AttemptHeader({ detail }) {
  const { attempt, student } = detail
  return (
    <Card className={styles.attemptHeader}>
      <IdentityPhoto attemptId={attempt.id} file={detail.identityPhoto} />
      <div className={styles.attemptInfo}>
        <h3 className={styles.attemptName}>
          {student.name} <span className={styles.muted}>{student.rollNo}</span>
        </h3>
        <div className={styles.attemptMeta}>
          <Chip spec={ATTEMPT_STATUS[attemptStatusKey(attempt)]} />
          <span>
            {scoreText(attempt.score, attempt.maxScore)} · {percentText(attempt.percent)}
            {attempt.outcome ? ` · ${attempt.outcome}` : ''}
          </span>
        </div>
        <p className={styles.muted}>
          Started {formatDateTime(attempt.startedAt)} · Submitted {formatDateTime(attempt.submittedAt)}
        </p>
      </div>
    </Card>
  )
}

function ViewSwitch({ views, value, onChange }) {
  return (
    <div className={styles.segmented} role="group" aria-label="Attempt view">
      {views.map((view) => (
        <button key={view.id} type="button" aria-pressed={value === view.id} className={styles.segment} onClick={() => onChange(view.id)}>
          {view.label}
        </button>
      ))}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className={styles.panel} aria-busy="true">
      <Skeleton height={120} radius={14} />
      <Skeleton width={260} height={32} />
      <Skeleton height={200} radius={14} />
    </div>
  )
}

export function AttemptPanel({ attemptId }) {
  const { data, error, loading, refetch } = useApi('admin.attempts.get', { attemptId })
  const [view, setView] = useState('answers')

  if (loading && !data) return <PanelSkeleton />
  if (error) {
    return (
      <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
        {errorMessage(error)}
      </Banner>
    )
  }
  if (!data) return null

  const screens = capturesOf(data.captures, 'screen')
  const webcam = capturesOf(data.captures, 'camera')
  const views = [
    { id: 'answers', label: `Answers (${data.answers.length})` },
    { id: 'screen', label: `Screen (${screens.length})` },
    { id: 'camera', label: `Webcam (${webcam.length})` },
  ]

  return (
    <div className={styles.panel}>
      <AttemptHeader detail={data} />
      <ViewSwitch views={views} value={view} onChange={setView} />
      {view === 'answers' && <AnswerList answers={data.answers} />}
      {view === 'screen' && <Gallery key="screen" attemptId={attemptId} kind="screen" kindLabel="Screen" captures={screens} />}
      {view === 'camera' && <Gallery key="camera" attemptId={attemptId} kind="camera" kindLabel="Webcam" captures={webcam} />}
    </div>
  )
}
