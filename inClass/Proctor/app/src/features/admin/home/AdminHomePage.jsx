// A1 Admin home: greeting header, four stat tiles, then "Needs your attention" and "Recent activity" side by side.
import { ArrowRight, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { PageHeader } from '../../../components/PageHeader.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { StatTile } from '../../../components/StatTile.jsx'
import { errorMessage } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useApi } from '../../../lib/useApi.js'
import { NewExamDialog } from '../exams/NewExamDialog.jsx'
import styles from './Home.module.css'

// Proctoring is gone, so flag reviews no longer need the examiner's attention here.
const ATTENTION = {
  publish_results: { tone: 'toneAttention', action: 'Publish results…', tab: 'results' },
  draft_problems: { tone: 'toneCritical', action: 'Fix', tab: '' },
}

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

function Tiles({ tiles, drafts }) {
  return (
    <div className={styles.tiles}>
      <StatTile label="Live now" value={tiles.liveExams} detail={plural(tiles.liveExams, 'exam') + ' open'} />
      <StatTile label="Writing" value={tiles.writing} detail={tiles.writing === 1 ? 'student in an exam' : 'students in an exam'} />
      <StatTile label="Results ready" value={tiles.resultsReady} detail="waiting to be published" />
      <StatTile label="Drafts to fix" value={drafts} detail="before they can publish" />
    </div>
  )
}

function AttentionList({ items }) {
  const navigate = useNavigate()
  const shown = items.filter((item) => ATTENTION[item.kind])
  if (shown.length === 0) return <p className={styles.quiet}>Nothing needs you right now.</p>
  return (
    <ul className={styles.list}>
      {shown.map((item) => {
        const spec = ATTENTION[item.kind]
        const to = `/admin/exams/${item.examId}${spec.tab ? `/${spec.tab}` : ''}`
        return (
          <li key={`${item.kind}-${item.examId}`} className={`${styles.attention} ${styles[spec.tone]}`}>
            <div className={styles.attentionText}>
              <span className={styles.rowTitle}>{item.examTitle}</span>
              <span className={styles.rowText}>{item.message}</span>
            </div>
            <Button variant="ghost" onClick={() => navigate(to)}>
              {spec.action}
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

function RecentList({ items }) {
  if (items.length === 0) return <p className={styles.quiet}>No submissions yet.</p>
  return (
    <ol className={styles.timeline}>
      {items.map((item) => (
        <li key={item.attemptId} className={styles.event}>
          <time className={styles.time} dateTime={item.at}>{timeOf(item.at)}</time>
          <span className={styles.marker} aria-hidden="true" />
          <span className={styles.eventText}>
            {item.text}
            {item.maxScore ? <span className={styles.score}> {item.score} / {item.maxScore}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

function LoadingHome() {
  return (
    <div className={styles.tiles} aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} height={112} radius={10} />
      ))}
    </div>
  )
}

export function AdminHomePage() {
  const navigate = useNavigate()
  const { data, error, loading, refetch } = useApi('admin.home')
  const [creating, setCreating] = useState(false)
  const isEmpty = data && data.attention.length === 0 && data.recent.length === 0 && data.tiles.liveExams === 0
  const drafts = data ? data.attention.filter((item) => item.kind === 'draft_problems').length : 0

  return (
    <div className={`${styles.page} page-enter`}>
      <PageHeader
        title={greeting()}
        description="What is running, what needs you, and what just happened."
        actions={
          <Button variant="primary" size="lg" icon={Plus} onClick={() => setCreating(true)}>
            New exam
          </Button>
        }
      />
      {loading && !data && <LoadingHome />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && <Tiles tiles={data.tiles} drafts={drafts} />}
      {isEmpty && (
        <EmptyState title="Nothing running yet." action={<Button onClick={() => navigate('/admin/exams')}>Go to exams</Button>}>
          Create an exam and publish it to see activity here.
        </EmptyState>
      )}
      {data && !isEmpty && (
        <div className={styles.columns}>
          <Card>
            <h2 className={styles.section}>Needs your attention</h2>
            <AttentionList items={data.attention} />
          </Card>
          <Card>
            <h2 className={styles.section}>Recent activity</h2>
            <RecentList items={data.recent} />
          </Card>
        </div>
      )}
      {creating && <NewExamDialog exams={[]} onClose={() => setCreating(false)} />}
    </div>
  )
}
