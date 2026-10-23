// C1 Exams (student dashboard): resume banner, filters, one card per published exam.
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { errorMessage } from '../../lib/api.js'
import { minutesLeft } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { FILTERS, MY_STATUS, cardAction, cardLines } from './examCardModel.js'
import styles from './Student.module.css'

function ExamCard({ exam }) {
  const action = cardAction(exam)
  const [size, ...rest] = cardLines(exam)
  return (
    <article className={styles.card} aria-labelledby={`exam-${exam.id}`}>
      <Chip spec={MY_STATUS[exam.myStatus]} />
      <h2 id={`exam-${exam.id}`} className={styles.cardTitle}>
        {exam.title}
      </h2>
      <p className={styles.cardMeta}>{size}</p>
      {rest.map((line) => (
        <p key={line} className={styles.cardLine}>
          {line}
        </p>
      ))}
      <div className={styles.cardFooter}>
        {action && (
          <Link to={action.to} className={`${styles.linkButton} ${action.primary ? styles.linkPrimary : ''}`}>
            {action.label}
          </Link>
        )}
      </div>
    </article>
  )
}

function LoadingCards() {
  return (
    <div className={styles.grid} aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className={styles.card}>
          <Skeleton width={80} height={20} radius={999} />
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" />
        </div>
      ))}
    </div>
  )
}

export function ExamsPage() {
  const { data, error, loading, refetch } = useApi('exams.list')
  const [filter, setFilter] = useState('all')
  const exams = data?.exams ?? []
  const running = exams.find((exam) => exam.myStatus === 'in_progress')
  const visible = exams.filter(FILTERS.find((f) => f.id === filter).match)

  return (
    <div className={styles.page}>
      {running && (
        <Banner
          tone="focus"
          action={
            <Link to={`/student/attempts/${running.openAttemptId}/resume`} className={`${styles.linkButton} ${styles.linkPrimary}`}>
              Resume
            </Link>
          }
        >
          You have an exam in progress: <strong>{running.title}</strong> · {minutesLeft(running.deadlineAt)} min left
        </Banner>
      )}
      <header className={styles.header}>
        <h1 className={styles.title}>Exams</h1>
        <p className={styles.subtitle}>Exams you can take now and soon.</p>
      </header>
      <div className={styles.filters} role="group" aria-label="Filter exams">
        {FILTERS.map((f) => {
          const count = exams.filter(f.match).length
          return (
            <button key={f.id} type="button" className={styles.filter} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              {f.id !== 'all' && count > 0 && <span className={styles.filterCount}>{count}</span>}
            </button>
          )
        })}
      </div>
      {loading && !data && <LoadingCards />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && exams.length === 0 && <EmptyState title="No exams yet.">Your examiner will publish them here.</EmptyState>}
      {data && exams.length > 0 && visible.length === 0 && <EmptyState>Nothing here. Try another filter.</EmptyState>}
      {visible.length > 0 && (
        <div className={styles.grid}>
          {visible.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  )
}
