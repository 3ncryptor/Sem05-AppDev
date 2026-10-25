// "Welcome back" (SCREENS C6 resume path): camera check, then
// exam:enter and back into the exam room. Consent and the identity photo aren't repeated.
import { Check, CircleX, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { api, errorMessage, ipc } from '../../lib/api.js'
import { minutesLeft } from '../../lib/format.js'
import { CameraPreview } from './CameraPreview.jsx'
import { runRow } from './checks.js'
import { QuietLayout } from './QuietLayout.jsx'
import styles from './Pretest.module.css'

const ICONS = { checking: LoaderCircle, ok: Check, fail: CircleX }

export function ResumePage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const video = useRef(null)
  const [room, setRoom] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [camera, setCamera] = useState({ status: 'checking' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('attempts.get', { attemptId }).then(setRoom).catch(setLoadError)
  }, [attemptId])

  useEffect(() => {
    if (!room || room.attempt.status !== 'in_progress') return
    let cancelled = false
    ;(async () => {
      const cam = await runRow('camera', {})
      if (cancelled) return
      setCamera(cam)
    })()
    return () => {
      cancelled = true
    }
  }, [room])

  if (room && room.attempt.status !== 'in_progress') return <Navigate to={`/student/attempts/${attemptId}/done`} replace />

  const ready = camera.status === 'ok'
  const onContinue = async () => {
    setBusy(true)
    try {
      await ipc.examEnter(attemptId)
      navigate(`/student/attempts/${attemptId}`, { replace: true })
    } catch (caught) {
      setBusy(false)
      setLoadError(caught)
    }
  }
  const status = (label, state) => {
    const Icon = ICONS[state.status] ?? CircleX
    return (
      <li className={styles.rowLine} data-status={state.status}>
        <Icon size={16} aria-hidden="true" className={state.status === 'checking' ? styles.spin : ''} /> {label}
      </li>
    )
  }

  return (
    <QuietLayout title={room?.exam.title}>
      <article className={styles.card} aria-labelledby="resume-title">
        <h1 id="resume-title" className={styles.title}>
          Welcome back
        </h1>
        {room && (
          <p className={styles.soft}>
            Your exam is still running: {minutesLeft(room.attempt.deadlineAt, Date.parse(room.attempt.serverNow))} min left.
            Your answers are saved.
          </p>
        )}
        {loadError && (
          <p className={styles.errorText} role="alert">
            {errorMessage(loadError)}
          </p>
        )}
        <div className={styles.photoFrame}>
          <CameraPreview videoRef={video} ready={camera.status === 'ok'} />
        </div>
        <ul className={styles.rows}>
          {status(camera.status === 'fail' ? 'The camera isn’t working. Close other apps using it.' : 'Camera', camera)}
        </ul>
        <div className={styles.footer}>
          <Button onClick={() => navigate('/student/exams')}>‹ Exams</Button>
          <span className={styles.footerRight}>
            <Button variant="primary" onClick={onContinue} disabled={!ready} loading={busy}>
              Continue
            </Button>
          </span>
        </div>
      </article>
    </QuietLayout>
  )
}
