// C15 Result: the outcome, the score against the pass mark, and every question reviewed.
import { ChevronLeft, Hourglass } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '../../components/EmptyState.jsx'
import { formatDateTime } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { LoadError, LoadingRows } from './PageStates.jsx'
import { QuestionReview } from './QuestionReview.jsx'
import { REVIEW_FILTERS, formatMarks, formatPercent } from './reviewModel.js'
import styles from './Results.module.css'

function BackLink() {
  return (
    <Link to="/student/results" className={styles.back}>
      <ChevronLeft size={16} aria-hidden="true" /> Results
    </Link>
  )
}

function NotAvailable() {
  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <BackLink />
      <EmptyState icon={Hourglass} title="Results aren't available yet.">
        Your examiner will publish them.
      </EmptyState>
    </div>
  )
}

function Outcome({ result }) {
  return (
    <section className={styles.outcome} aria-label="Outcome">
      <div>
        <p className={styles.outcomeWord}>{result.outcome ?? 'Scored'}</p>
        <p className={styles.outcomeScore}>
          {formatMarks(result.score)} / {formatMarks(result.maxScore)} · {formatPercent(result.percent)}
        </p>
      </div>
      <p className={styles.muted}>Pass mark {result.passPercent} %</p>
    </section>
  )
}

function Filters({ questions, filter, onChange }) {
  return (
    <div className={styles.filters} role="group" aria-label="Filter questions">
      {REVIEW_FILTERS.map((f) => (
        <button key={f.id} type="button" className={styles.filter} aria-pressed={filter === f.id} onClick={() => onChange(f.id)}>
          {f.label} <span className={styles.filterCount}>{questions.filter(f.match).length}</span>
        </button>
      ))}
    </div>
  )
}

function subtitleOf(result) {
  const published = result.resultsPublishedAt ? ` · results published ${formatDateTime(result.resultsPublishedAt)}` : ''
  return `Submitted ${formatDateTime(result.submittedAt)}${published}`
}

export function ResultPage() {
  const { attemptId } = useParams()
  const { data, error, refetch } = useApi('attempts.result', { attemptId })
  const [filter, setFilter] = useState('all')

  if (error?.code === 'RESULTS_NOT_AVAILABLE') return <NotAvailable />
  if (error) return <LoadError error={error} onRetry={refetch} />
  if (!data) return <LoadingRows />

  const questions = data.questions ?? []
  const numbered = questions.map((question, index) => ({ question, no: index + 1 }))
  const match = REVIEW_FILTERS.find((f) => f.id === filter).match
  const visible = numbered.filter(({ question }) => match(question))

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <BackLink />
      <header>
        <h1 className={styles.title}>{data.examTitle}</h1>
        <p className={styles.subtitle}>{subtitleOf(data)}</p>
      </header>
      <Outcome result={data} />
      {questions.length > 0 && <Filters questions={questions} filter={filter} onChange={setFilter} />}
      {questions.length === 0 && <EmptyState>This exam has no questions to review.</EmptyState>}
      {questions.length > 0 && visible.length === 0 && <EmptyState>Nothing here. Try another filter.</EmptyState>}
      <ol className={styles.questions}>
        {visible.map(({ question, no }) => (
          <QuestionReview key={question.id} question={question} no={no} />
        ))}
      </ol>
    </div>
  )
}
