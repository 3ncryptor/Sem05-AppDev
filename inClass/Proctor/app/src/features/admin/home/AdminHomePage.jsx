// A1 Admin home: four stat tiles, what needs attention, and the latest submissions.
import { RotateCw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { StatTile } from '../../../components/StatTile.jsx'
import { errorMessage } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useApi } from '../../../lib/useApi.js'
import styles from './Home.module.css'

// Proctoring is gone, so flag reviews no longer need the examiner's attention here.
const ATTENTION = {
  publish_results: { symbol: '●', action: 'Publish results…', tab: 'results' },
  draft_problems: { symbol: '○', action: 'Fix', tab: '' },
}

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

function Tiles({ tiles }) {
  return (
    <div className={styles.tiles}>
      <StatTile label="Live now" value={plural(tiles.liveExams, 'exam')} />
      <StatTile label="Writing" value={plural(tiles.writing, 'student')} />
      <StatTile label="Results ready" value={plural(tiles.resultsReady, 'exam')} />
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
          <li key={`${item.kind}-${item.examId}`} className={styles.row}>
            <span className={styles.symbol} aria-hidden="true">{spec.symbol}</span>
            <span className={styles.rowTitle}>{item.examTitle}</span>
            <span className={styles.rowText}>{item.message}</span>
            <Button onClick={() => navigate(to)}>{spec.action}</Button>
          </li>
        )
      })}
    </ul>
  )
}

function RecentList({ items }) {
  if (items.length === 0) return <p className={styles.quiet}>No submissions yet.</p>
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.attemptId} className={styles.row}>
          <span className={styles.time}>{timeOf(item.at)}</span>
          <span className={styles.rowText}>
            {item.text}
            {item.maxScore ? ` (${item.score} / ${item.maxScore})` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LoadingHome() {
  return (
    <div className={styles.tiles} aria-busy="true">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={84} radius={14} />
      ))}
    </div>
  )
}

export function AdminHomePage() {
  const navigate = useNavigate()
  const { data, error, loading, refetch } = useApi('admin.home')
  const isEmpty = data && data.attention.length === 0 && data.recent.length === 0 && data.tiles.liveExams === 0

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{greeting()}</h1>
      {loading && !data && <LoadingHome />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && <Tiles tiles={data.tiles} />}
      {isEmpty && (
        <EmptyState title="Nothing running yet." action={<Button variant="primary" onClick={() => navigate('/admin/exams')}>Go to exams</Button>}>
          Create an exam and publish it to see activity here.
        </EmptyState>
      )}
      {data && !isEmpty && (
        <>
          <Card>
            <h2 className={styles.section}>Needs your attention</h2>
            <AttentionList items={data.attention} />
          </Card>
          <Card>
            <h2 className={styles.section}>Recent</h2>
            <RecentList items={data.recent} />
          </Card>
        </>
      )}
    </div>
  )
}
