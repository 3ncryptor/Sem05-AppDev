// C3 Step 1 · System check. Rows run in order: waiting → checking → ✓ / ✕ (with a fix card) / ⚠.
import { Check, Circle, CircleX, Lightbulb, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { CameraPreview } from './CameraPreview.jsx'
import { ROWS, allPassed, checkSummary, runRow } from './checks.js'
import { FixCard } from './FixCard.jsx'
import { usePretest } from './pretestContext.js'
import styles from './Pretest.module.css'

const INITIAL = Object.fromEntries(ROWS.map((row) => [row.id, { status: 'waiting' }]))
const ICONS = { waiting: Circle, checking: LoaderCircle, ok: Check, warn: TriangleAlert, unavailable: TriangleAlert, fail: CircleX, skipped: Check }
const CAMERA_ROWS = ['camera', 'face', 'light']

function rowText(row, state) {
  if (state.status === 'ok') return row.okLabel ?? row.label
  if (state.status === 'checking' && row.id === 'face') return 'Face: hold still for 2 seconds…'
  if (state.status === 'unavailable') return 'Face check unavailable: the exam will run without it'
  if (state.status === 'skipped') return `${row.label}: skipped (dev only)`
  if (row.id === 'displays' && Number.isInteger(state.detail)) return `Displays: ${state.detail}`
  return row.label
}

export function SystemCheckPage() {
  const { exam, devMode, setCheck } = usePretest()
  const navigate = useNavigate()
  const video = useRef(null)
  const [rows, setRows] = useState(INITIAL)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)

  const setRow = (id, patch) => setRows((current) => ({ ...current, [id]: { ...current[id], ...patch } }))

  /** Runs the given rows one after another. Camera-dependent rows wait if the camera failed. */
  const run = useCallback(
    async (ids) => {
      setRunning(true)
      let cameraOk = true
      for (const id of ids) {
        const row = ROWS.find((r) => r.id === id)
        if (row.needsCamera && !cameraOk) {
          setRow(id, { status: 'waiting', kind: null })
          continue
        }
        setRow(id, { status: 'checking', kind: null })
        if (id === 'face') setProgress(0)
        const result = await runRow(id, { video: video.current, exam, onProgress: setProgress })
        setRow(id, result)
        if (id === 'camera' && result.status !== 'ok') cameraOk = false
      }
      setRunning(false)
    },
    [exam],
  )

  // Start on the next tick, so a StrictMode double-mount cancels the first run instead of racing it.
  useEffect(() => {
    const id = setTimeout(() => run(ROWS.map((row) => row.id)), 0)
    return () => clearTimeout(id)
  }, [run])

  const rerun = (id) => run(id === 'camera' ? CAMERA_ROWS : [id])
  const passed = !running && allPassed(rows)
  const onContinue = () => {
    setCheck({ passed: true, summary: checkSummary(rows), faceSkipped: rows.face.status !== 'ok' })
    navigate('../rules')
  }

  return (
    <div className={styles.wide}>
      <header className={styles.heading}>
        <h1 className={styles.title}>Let’s check your setup</h1>
        <p className={styles.soft}>This takes about 2 minutes. Nothing is recorded yet.</p>
      </header>
      <div className={styles.checkGrid}>
        <CameraPreview videoRef={video} ready={rows.camera.status === 'ok'} />
        <ul className={styles.rows} aria-label="System check">
          {ROWS.map((row) => {
            const state = rows[row.id]
            const Icon = ICONS[state.status]
            const failed = state.status === 'fail' || state.status === 'warn' || state.status === 'unavailable'
            return (
              <li key={row.id} className={styles.row} data-status={state.status}>
                <span className={styles.rowLine}>
                  <Icon size={16} aria-hidden="true" className={state.status === 'checking' ? styles.spin : ''} />
                  <span>{rowText(row, state)}</span>
                  <span className="visually-hidden">{state.status}</span>
                  {row.id === 'face' && state.status === 'checking' && (
                    <span className={styles.bar} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${progress * 100}%` }} />
                    </span>
                  )}
                </span>
                {failed && state.kind && (
                  <FixCard
                    kind={state.kind}
                    warn={state.status !== 'fail'}
                    displays={state.detail}
                    onRetry={() => rerun(row.id)}
                    onSkip={devMode && state.status === 'fail' ? () => setRow(row.id, { status: 'skipped' }) : undefined}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <p className={styles.tip}>
        <Lightbulb size={16} aria-hidden="true" /> Turn on Do Not Disturb now: notifications can pull focus during the exam.
      </p>
      <div className={styles.footer}>
        <Button onClick={() => navigate(`/student/exams/${exam.id}`)}>‹ Back</Button>
        <Button variant="primary" onClick={onContinue} disabled={!passed}>
          Continue
        </Button>
      </div>
    </div>
  )
}
