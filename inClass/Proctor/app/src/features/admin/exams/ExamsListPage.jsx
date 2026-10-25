// A2 Exams: status filters, search, the exams table, and the New exam / Duplicate / Delete dialogs.
import { Copy, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Input } from '../../../components/Input.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { Table } from '../../../components/Table.jsx'
import { errorMessage } from '../../../lib/api.js'
import { EXAM_STATUS } from '../../../lib/status.js'
import { useApi } from '../../../lib/useApi.js'
import { DeleteExamDialog } from './DeleteExamDialog.jsx'
import { NewExamDialog } from './NewExamDialog.jsx'
import { FILTERS, attemptsCell, matchesFilter, matchesQuery, questionsCell, resultsCell, windowCell } from './examRows.js'
import styles from './Exams.module.css'

function RowActions({ row, onDuplicate, onDelete }) {
  const stop = (fn) => (event) => {
    event.stopPropagation()
    fn(row)
  }
  return (
    <div className={styles.rowActions} onKeyDown={(event) => event.stopPropagation()}>
      <Button variant="ghost" icon={Copy} onClick={stop(onDuplicate)} aria-label={`Duplicate ${row.title}`} title="Duplicate" />
      {row.status === 'draft' && (
        <Button variant="ghost" icon={Trash2} onClick={stop(onDelete)} aria-label={`Delete ${row.title}`} title="Delete draft" />
      )}
    </div>
  )
}

function columnsFor(handlers) {
  return [
    {
      key: 'title',
      label: 'Exam',
      render: (row) => (
        <span className={styles.examCell}>
          <span className={styles.examTitle}>{row.title}</span>
          <span className={styles.examCode}>{row.code}</span>
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <Chip spec={EXAM_STATUS[row.displayStatus]} /> },
    { key: 'questions', label: 'Questions', render: questionsCell },
    { key: 'window', label: 'Window', render: windowCell },
    { key: 'attempts', label: 'Attempts', align: 'right', render: attemptsCell },
    { key: 'results', label: 'Results', render: resultsCell },
    { key: 'actions', label: 'Actions', align: 'right', render: (row) => <RowActions row={row} {...handlers} /> },
  ]
}

function FilterBar({ exams, filter, onFilter, query, onQuery }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="Filter exams">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={styles.filter} aria-pressed={filter === f.id} onClick={() => onFilter(f.id)}>
            {f.label} <span className={styles.filterCount}>{exams.filter((row) => matchesFilter(row, f.id)).length}</span>
          </button>
        ))}
      </div>
      <div className={styles.search}>
        <Input label="Search exams" hideLabel placeholder="Search" type="search" value={query} onChange={(event) => onQuery(event.target.value)} />
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className={styles.loading} aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} height={36} />
      ))}
    </div>
  )
}

export function ExamsListPage() {
  const navigate = useNavigate()
  const { data, error, loading, refetch } = useApi('admin.exams.list')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(/** @type {null | { copyFrom: object | null }} */ (null))
  const [deleting, setDeleting] = useState(null)
  const exams = data?.exams ?? []
  const visible = exams.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query))
  const columns = columnsFor({ onDuplicate: (row) => setCreating({ copyFrom: row }), onDelete: setDeleting })
  const newExam = (
    <Button variant="primary" icon={Plus} onClick={() => setCreating({ copyFrom: null })}>
      New exam
    </Button>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Exams</h1>
          <p className={styles.subtitle}>Build, publish and run exams.</p>
        </div>
        {newExam}
      </header>
      {data && exams.length > 0 && <FilterBar exams={exams} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />}
      {loading && !data && <LoadingRows />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && exams.length === 0 && <EmptyState title="No exams yet." action={newExam}>Create your first exam to start adding questions.</EmptyState>}
      {data && exams.length > 0 && visible.length === 0 && <EmptyState>Nothing matches. Try another filter or search.</EmptyState>}
      {visible.length > 0 && (
        <Table caption="Exams" columns={columns} rows={visible} rowKey={(row) => row.id} onRowClick={(row) => navigate(`/admin/exams/${row.id}`)} />
      )}
      {creating && <NewExamDialog exams={exams} copyFrom={creating.copyFrom} onClose={() => setCreating(null)} />}
      {deleting && (
        <DeleteExamDialog
          exam={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
