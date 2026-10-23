// C6 Step 4 · Begin (BUILD_PLAN §22.2): start the attempt, save the identity photo, enter the exam.
import { Camera, Clock, Maximize } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { Kbd } from '../../components/Kbd.jsx'
import { api, errorMessage, ipc } from '../../lib/api.js'
import { usePretest } from './pretestContext.js'
import styles from './Pretest.module.css'

const STOP_CODES = new Set(['EXAM_NOT_OPEN', 'NO_ATTEMPTS_LEFT'])

export function BeginPage() {
  const { exam, check, consent, photo } = usePretest()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!photo) return <Navigate to="../photo" replace />

  const onBegin = async () => {
    setBusy(true)
    setError(null)
    try {
      const started = await api('attempts.start', { examId: exam.id, consent, systemCheck: check.summary })
      const attemptId = started.attempt.id
      // A resumed attempt already has its identity photo; consent and photo aren't repeated.
      if (!started.resumed) await ipc.evidenceSave({ attemptId, kind: 'identity', reason: 'identity', bytes: photo.bytes })
      await ipc.examEnter(attemptId)
      navigate(`/student/attempts/${attemptId}`, { replace: true })
    } catch (caught) {
      setBusy(false)
      setError(caught)
    }
  }

  if (error && STOP_CODES.has(error.code)) {
    return (
      <article className={styles.card}>
        <h1 className={styles.title}>You can’t start this exam</h1>
        <p>{errorMessage(error)}</p>
        <div className={styles.footer}>
          <span />
          <Link to="/student/exams">Back to exams</Link>
        </div>
      </article>
    )
  }

  return (
    <article className={styles.card} aria-labelledby="begin-title">
      <h1 id="begin-title" className={styles.title}>
        Ready when you are
      </h1>
      <ul className={styles.ruleList}>
        <li className={styles.ruleLine}>
          <Clock size={16} aria-hidden="true" /> <span>{exam.durationMinutes} minutes start when you press Begin.</span>
        </li>
        <li className={styles.ruleLine}>
          <Maximize size={16} aria-hidden="true" /> <span>Athena switches to fullscreen.</span>
        </li>
        {exam.proctoring?.enabled && (
          <li className={styles.ruleLine}>
            <Camera size={16} aria-hidden="true" /> <span>Camera and screen capture start.</span>
          </li>
        )}
      </ul>
      <section className={styles.block}>
        <h2 className={styles.label}>Keys during the exam</h2>
        <p className={styles.keys}>
          <Kbd>1</Kbd>–<Kbd>9</Kbd> choose · <Kbd>N</Kbd> next · <Kbd>P</Kbd> previous · <Kbd>M</Kbd> mark · <Kbd>Q</Kbd> questions
        </p>
      </section>
      {error && (
        <p className={styles.errorText} role="alert">
          {errorMessage(error)}
        </p>
      )}
      <div className={styles.footer}>
        <Button onClick={() => navigate('../photo')} disabled={busy}>
          ‹ Back
        </Button>
        <Button variant="primary" size="lg" onClick={onBegin} loading={busy}>
          Begin
        </Button>
      </div>
    </article>
  )
}
