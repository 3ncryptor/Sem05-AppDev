// A11 Results: ranked table, publish results, release one attempt, export CSV.
import { Download, RotateCw, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { Table } from '../../../components/Table.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage, ipc } from '../../../lib/api.js'
import { formatDateTime, tildePath } from '../../../lib/format.js'
import { ATTEMPT_STATUS, RESULT_STATUS } from '../../../lib/status.js'
import { useApi, useMutation } from '../../../lib/useApi.js'
import { PublishDialog } from './PublishDialog.jsx'
import {
  attemptStatusKey, canRelease, formatDuration, percentText, rankRows, resultStatusKey, scoreText, timeTakenSec,
} from './resultsModel.js'
import styles from './Results.module.css'

function policyLine(exam) {
  const when = exam.visibility === 'after_submit'
    ? 'Students see results when they submit'
    : exam.resultsPublishedAt
      ? `Published ${formatDateTime(exam.resultsPublishedAt)}`
      : 'Students see results when you publish'
  return `${when} · pass ${exam.passPercent} %`
}

function columns(onRelease, releasingId) {
  return [
    { key: 'rank', label: '#', render: (r) => r.rank ?? '—' },
    {
      key: 'student',
      label: 'Student',
      render: (r) => (
        <span className={styles.student}>
          {r.student.name} <span className={styles.muted}>{r.student.rollNo}</span>
        </span>
      ),
    },
    { key: 'score', label: 'Score', align: 'right', render: (r) => scoreText(r.score, r.maxScore) },
    { key: 'percent', label: '%', align: 'right', render: (r) => percentText(r.percent) },
    { key: 'time', label: 'Time taken', align: 'right', render: (r) => formatDuration(timeTakenSec(r)) },
    { key: 'status', label: 'Status', render: (r) => <Chip spec={ATTEMPT_STATUS[attemptStatusKey(r)]} /> },
    { key: 'outcome', label: 'Outcome', render: (r) => r.outcome ?? '—' },
    {
      key: 'result',
      label: 'Result',
      render: (r) => (
        <span className={styles.resultCell}>
          <Chip spec={RESULT_STATUS[resultStatusKey(r)]} />
          {canRelease(r) && (
            <Button variant="ghost" onClick={() => onRelease(r)} loading={releasingId === r.attemptId}>
              Release
            </Button>
          )}
        </span>
      ),
    },
  ]
}

function LoadingTable() {
  return (
    <div className={styles.loading} aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} height={36} />
      ))}
    </div>
  )
}

function useCsvExport(examId, examCode) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const run = async () => {
    setExporting(true)
    try {
      const saved = await ipc.exportResultsCsv(examId, examCode)
      if (saved) toast(`Saved to ${tildePath(saved.path)}`, { tone: 'ok' })
    } catch (error) {
      toast(errorMessage(error), { tone: 'critical' })
    } finally {
      setExporting(false)
    }
  }
  return { exporting, run }
}

function useRelease(onDone) {
  const toast = useToast()
  const release = useMutation('admin.attempts.release')
  const [releasingId, setReleasingId] = useState(null)
  const run = async (row) => {
    setReleasingId(row.attemptId)
    try {
      await release.run({ attemptId: row.attemptId })
      toast(`Result released to ${row.student.name}`, { tone: 'ok' })
      onDone()
    } catch (error) {
      toast(errorMessage(error), { tone: 'critical' })
    } finally {
      setReleasingId(null)
    }
  }
  return { releasingId, run }
}

export function ResultsPage() {
  const { examId } = useParams()
  const { data, error, loading, refetch } = useApi('admin.results.list', { examId })
  const examInfo = useApi('admin.exams.get', { examId })
  const examCode = (examInfo.data?.exam ?? examInfo.data)?.code
  const csv = useCsvExport(examId, examCode)
  const release = useRelease(refetch)
  const [publishOpen, setPublishOpen] = useState(false)

  const exam = data?.exam
  const rows = rankRows(data?.rows ?? [])
  const canPublish = exam && exam.visibility !== 'after_submit' && !exam.resultsPublishedAt

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Results</h2>
          {exam && <p className={styles.muted}>{policyLine(exam)}</p>}
        </div>
        <div className={styles.actions}>
          <Button icon={Download} onClick={csv.run} loading={csv.exporting} disabled={!exam || rows.length === 0}>
            Export CSV
          </Button>
          {canPublish && (
            <Button variant="primary" onClick={() => setPublishOpen(true)}>
              Publish results…
            </Button>
          )}
        </div>
      </header>

      {data?.pipeline && (
        <p className={styles.pipeline}>
          Submitted {data.pipeline.submitted} · Ready {data.pipeline.ready} · Visible {data.pipeline.visible}
        </p>
      )}

      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {loading && !data && <LoadingTable />}
      {data && rows.length === 0 && (
        <EmptyState icon={Trophy} title="No attempts yet">
          Results appear here once students start the exam.
        </EmptyState>
      )}
      {rows.length > 0 && (
        <Table caption="Results" columns={columns(release.run, release.releasingId)} rows={rows} rowKey={(r) => r.attemptId} />
      )}

      {publishOpen && (
        <PublishDialog
          open
          onClose={() => setPublishOpen(false)}
          examId={examId}
          examTitle={exam?.title}
          onPublished={refetch}
        />
      )}
    </div>
  )
}
