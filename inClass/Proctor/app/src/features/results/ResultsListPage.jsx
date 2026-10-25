// C16 Results list: every finished attempt, with the score once the examiner has made it visible.
import { ArrowRight, ListChecks } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Chip } from '../../components/Chip.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { Table } from '../../components/Table.jsx'
import { formatWhen } from '../../lib/format.js'
import { RESULT_STATUS } from '../../lib/status.js'
import { useApi } from '../../lib/useApi.js'
import { LoadError, LoadingRows } from './PageStates.jsx'
import { formatMarks } from './reviewModel.js'
import styles from './Results.module.css'

const NOT_AVAILABLE = { ...RESULT_STATUS.not_available, label: 'Not available yet' }

function examName(row) {
  return row.attemptNo > 1 ? `${row.examTitle} · attempt ${row.attemptNo}` : row.examTitle
}

const COLUMNS = [
  { key: 'exam', label: 'Exam', render: examName },
  { key: 'submitted', label: 'Submitted', render: (row) => formatWhen(row.submittedAt) },
  {
    key: 'score',
    label: 'Score',
    align: 'right',
    render: (row) => <span className={styles.num}>{row.resultVisible ? `${formatMarks(row.score)} / ${formatMarks(row.maxScore)}` : '—'}</span>,
  },
  { key: 'percent', label: '%', align: 'right', render: (row) => <span className={styles.num}>{row.resultVisible ? row.percent : '—'}</span> },
  { key: 'outcome', label: 'Outcome', render: (row) => (row.resultVisible ? row.outcome : <Chip spec={NOT_AVAILABLE} />) },
  {
    key: 'view',
    label: '',
    align: 'right',
    render: (row) =>
      row.resultVisible && (
        <span className={styles.linkCell}>
          View <ArrowRight size={14} aria-hidden="true" />
        </span>
      ),
  },
]

export function ResultsListPage() {
  const navigate = useNavigate()
  const { data, error, refetch } = useApi('me.attempts')

  if (error) return <LoadError error={error} onRetry={refetch} />
  if (!data) return <LoadingRows />

  const rows = (data.attempts ?? []).filter((a) => a.status === 'submitted')
  const openResult = (row) => {
    if (row.resultVisible) navigate(`/student/results/${row.id}`)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Results</h1>
      </header>
      {rows.length === 0 ? (
        <EmptyState icon={ListChecks} title="No results yet." action={<Link to="/student/exams">Go to exams</Link>}>
          Results appear here after you submit an exam.
        </EmptyState>
      ) : (
        <Table caption="Your results" columns={COLUMNS} rows={rows} rowKey={(row) => row.id} onRowClick={openResult} />
      )}
    </div>
  )
}
