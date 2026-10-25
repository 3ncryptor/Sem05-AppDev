// A9 Live: who is writing right now, time left and connection, polled every 5 s. Extend or end attempts.
import { Pause, Play, RotateCw, Timer, Users } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { StatTile } from '../../../components/StatTile.jsx'
import { Switch } from '../../../components/Switch.jsx'
import { Table } from '../../../components/Table.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useApi, usePoll } from '../../../lib/useApi.js'
import { ActionDialog } from './ActionDialog.jsx'
import { POLL_MS, agoLabel, clockLabel, countersOf, isOnline, isWriting, sortAttempts, statusSpec, timeOf } from './liveModel.js'
import styles from './Live.module.css'

const TICK_MS = 1000

function Connection({ attempt }) {
  if (!isWriting(attempt)) return <span className={styles.muted}>—</span>
  if (isOnline(attempt)) return <Chip tone="ok" symbol="●">Online · {agoLabel(attempt.secondsSinceSeen)} ago</Chip>
  return <Chip tone="attention" symbol="○">Offline · last seen {agoLabel(attempt.secondsSinceSeen)} ago</Chip>
}

function columns(onAction) {
  return [
    {
      key: 'student',
      label: 'Student',
      render: (a) => (
        <div className={styles.student}>
          <span>{a.student.name}</span>
          <span className={styles.roll}>{a.student.rollNo}</span>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (a) => <Chip spec={statusSpec(a)} /> },
    { key: 'startedAt', label: 'Started', render: (a) => timeOf(a.startedAt) },
    { key: 'progress', label: 'Answered', align: 'right', render: (a) => `${a.answered ?? 0} / ${a.questionCount ?? '—'}` },
    {
      key: 'timeLeft',
      label: 'Time left',
      align: 'right',
      render: (a) => (isWriting(a) ? <span className={styles.clock}>{clockLabel(a.timeLeftSec)}</span> : <span className={styles.muted}>—</span>),
    },
    { key: 'connection', label: 'Connection', render: (a) => <Connection attempt={a} /> },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (a) =>
        isWriting(a) && (
          <div className={styles.rowActions}>
            <Button variant="ghost" onClick={() => onAction({ kind: 'extend', attempt: a })}>Extend…</Button>
            <Button variant="ghost" onClick={() => onAction({ kind: 'end', attempt: a })}>End…</Button>
          </div>
        ),
    },
  ]
}

function LoadingState() {
  return (
    <div className={styles.loading} aria-busy="true">
      <div className={styles.tiles}>
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} height={76} radius={14} />
        ))}
      </div>
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} height={40} />
      ))}
    </div>
  )
}

function UpdatedLine({ serverNow, nowMs, paused, refreshing, onTogglePause, onRefresh }) {
  const ago = serverNow ? Math.max(0, Math.round((nowMs - Date.parse(serverNow)) / 1000)) : null
  return (
    <div className={styles.updated}>
      <span className={styles.muted} aria-live="polite">
        {paused ? 'Paused' : ago === null ? 'Loading…' : `Updated ${agoLabel(ago)} ago`}
      </span>
      <Button variant="ghost" icon={RotateCw} onClick={onRefresh} loading={refreshing} aria-label="Refresh now" />
      <Button variant="ghost" icon={paused ? Play : Pause} onClick={onTogglePause} aria-label={paused ? 'Resume updates' : 'Pause updates'} />
    </div>
  )
}

function doneMessage(kind, result) {
  if (kind === 'extendAll') return `Extended ${plural(result?.extended ?? 0, 'attempt')}.`
  if (kind === 'extend') return `New end time ${timeOf(result?.deadlineAt)}.`
  return 'Exam ended. It closes on their screen within 10 s.'
}

export function LivePage() {
  const { examId } = useParams()
  const toast = useToast()
  const { data, error, loading, refetch } = useApi('admin.live', { examId })
  const [paused, setPaused] = useState(false)
  const [writingOnly, setWritingOnly] = useState(false)
  const [action, setAction] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  usePoll(refetch, POLL_MS, !paused && !action)
  usePoll(() => setNowMs(Date.now()), TICK_MS, true)

  const attempts = data?.attempts ?? []
  const counters = countersOf(attempts)
  const visible = sortAttempts(writingOnly ? attempts.filter(isWriting) : attempts)

  const onDone = (result) => {
    toast(doneMessage(action.kind, result), { tone: 'ok' })
    setAction(null)
    refetch()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Live</h2>
        <UpdatedLine
          serverNow={data?.serverNow}
          nowMs={nowMs}
          paused={paused}
          refreshing={loading && Boolean(data)}
          onTogglePause={() => setPaused((p) => !p)}
          onRefresh={refetch}
        />
      </header>
      {loading && !data && <LoadingState />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && (
        <div className={styles.tiles}>
          <StatTile label="Writing" value={counters.writing} />
          <StatTile label="Online" value={counters.online} />
          <StatTile label="Offline" value={counters.offline} detail={counters.offline ? 'No heartbeat for 30 s' : undefined} />
          <StatTile label="Finished" value={counters.finished} />
        </div>
      )}
      {data && attempts.length > 0 && (
        <div className={styles.toolbar}>
          <Switch label="Writing only" checked={writingOnly} onChange={(e) => setWritingOnly(e.target.checked)} />
          <Button icon={Timer} onClick={() => setAction({ kind: 'extendAll', count: counters.writing })} disabled={counters.writing === 0}>
            Extend everyone…
          </Button>
        </div>
      )}
      {data && attempts.length === 0 && <EmptyState icon={Users} title="No one has started this exam yet.">Students appear here as soon as they begin.</EmptyState>}
      {data && attempts.length > 0 && visible.length === 0 && <EmptyState>No one is writing right now. Turn off “Writing only” to see finished attempts.</EmptyState>}
      {visible.length > 0 && <Table caption="Attempts in this exam" columns={columns(setAction)} rows={visible} rowKey={(a) => a.id} />}
      <ActionDialog action={action} examId={examId} onClose={() => setAction(null)} onDone={onDone} />
    </div>
  )
}
