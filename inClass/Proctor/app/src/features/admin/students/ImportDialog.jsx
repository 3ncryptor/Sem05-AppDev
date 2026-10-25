// A8b import: choose a CSV, let the server check it (dry run), then create and show passwords once.
import { Copy, FileUp } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Table } from '../../../components/Table.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage, ipc } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useMutation } from '../../../lib/useApi.js'
import { parseStudentsCsv, passwordsCsv } from './csv.js'
import { copyText } from './studentsModel.js'
import styles from './Students.module.css'

const ROW_STATUS = Object.freeze({
  ready: { symbol: '✓', label: 'Ready', tone: 'ok' },
  exists: { symbol: '⚠', label: 'Exists', tone: 'attention' },
  problem: { symbol: '✕', label: 'Problem', tone: 'critical' },
})

const CHECK_COLUMNS = [
  { key: 'row', label: 'Row', align: 'right' },
  { key: 'rollNo', label: 'Roll no', render: (r) => <span className={styles.mono}>{r.rollNo || '—'}</span> },
  { key: 'name', label: 'Name', render: (r) => r.name || '—' },
  { key: 'status', label: '', render: (r) => <Chip spec={ROW_STATUS[r.status]}>{r.problem ?? ROW_STATUS[r.status].label}</Chip> },
]

const DONE_COLUMNS = [
  { key: 'rollNo', label: 'Roll no', render: (r) => <span className={styles.mono}>{r.rollNo}</span> },
  { key: 'name', label: 'Name' },
  { key: 'password', label: 'Password', render: (r) => <code className={styles.mono}>{r.password}</code> },
]

const START = Object.freeze({ step: 'choose', fileName: '', rows: [], check: null, created: [], error: null })

const STEP_LABELS = { choose: '① Choose file', check: '② Check', done: '③ Done' }

function CheckStep({ fileName, check, onChooseAgain }) {
  const { counts } = check
  return (
    <>
      <div className={styles.importHead}>
        <span>
          {fileName} · {plural(check.rows.length, 'row')}
        </span>
        <Button variant="ghost" icon={FileUp} onClick={onChooseAgain}>Choose another</Button>
      </div>
      <p className={styles.counts}>
        ✓ {counts.ready} ready · ⚠ {counts.exists} already exist (skipped) · ✕ {plural(counts.problems, 'problem')}
      </p>
      <div className={styles.scroll}>
        <Table caption="Rows in the file" columns={CHECK_COLUMNS} rows={check.rows} rowKey={(r) => String(r.row)} />
      </div>
    </>
  )
}

function DoneStep({ created, onCopy }) {
  if (created.length === 0) return <p>No new students were created.</p>
  return (
    <>
      <Banner tone="attention" action={<Button icon={Copy} onClick={onCopy}>Copy as CSV</Button>}>
        These passwords are shown once. Copy them before closing.
      </Banner>
      <div className={styles.scroll}>
        <Table caption="New students and their passwords" columns={DONE_COLUMNS} rows={created} rowKey={(r) => r.rollNo} />
      </div>
    </>
  )
}

/** @param {{ open: boolean, onClose: () => void, onImported: () => void }} props */
export function ImportDialog({ open, onClose, onImported }) {
  const toast = useToast()
  const { run, loading } = useMutation('admin.users.import')
  const [state, setState] = useState(START)
  const [choosing, setChoosing] = useState(false)

  const close = () => {
    setState(START)
    onClose()
  }

  const choose = async () => {
    setChoosing(true)
    try {
      const file = await ipc.openCsv()
      if (!file) return
      const { rows, error } = parseStudentsCsv(file.text)
      if (error) return setState({ ...START, error: `${file.name}: ${error}` })
      const check = await run({ rows, dryRun: true })
      setState({ ...START, step: 'check', fileName: file.name, rows, check })
    } catch (caught) {
      setState({ ...START, error: errorMessage(caught) })
    } finally {
      setChoosing(false)
    }
  }

  const importReady = async () => {
    try {
      const result = await run({ rows: state.rows, dryRun: false })
      setState((current) => ({ ...current, step: 'done', created: result.created, error: null }))
      onImported()
    } catch (caught) {
      setState((current) => ({ ...current, error: errorMessage(caught) }))
    }
  }

  const copyAll = async () => {
    const copied = await copyText(passwordsCsv(state.created))
    toast(copied ? 'Passwords copied as CSV.' : "Couldn't copy to the clipboard.", { tone: copied ? 'ok' : 'critical' })
  }

  const ready = state.check?.counts.ready ?? 0
  const footer =
    state.step === 'done' ? (
      <Button variant="primary" onClick={close}>Done</Button>
    ) : (
      <>
        <Button onClick={close}>Cancel</Button>
        {state.step === 'check' && (
          <Button variant="primary" onClick={importReady} loading={loading} disabled={ready === 0}>
            Import {plural(ready, 'student')}
          </Button>
        )}
      </>
    )

  return (
    <Dialog open={open} onClose={close} title="Import students" description={STEP_LABELS[state.step]} footer={footer}>
      <div className={styles.form}>
        {state.error && <Banner tone="critical" role="alert">{state.error}</Banner>}
        {state.step === 'choose' && (
          <>
            <p>Pick a .csv file whose first row is <code className={styles.mono}>rollNo,name</code>. Passwords are generated.</p>
            <div>
              <Button variant="primary" icon={FileUp} onClick={choose} loading={choosing}>Choose file…</Button>
            </div>
          </>
        )}
        {state.step === 'check' && <CheckStep fileName={state.fileName} check={state.check} onChooseAgain={choose} />}
        {state.step === 'done' && <DoneStep created={state.created} onCopy={copyAll} />}
      </div>
    </Dialog>
  )
}
