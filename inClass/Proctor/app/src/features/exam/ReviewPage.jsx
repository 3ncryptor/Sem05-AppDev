// C12 Review & submit: marked questions first, then unanswered, each with Go. Then the native confirm.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { api, errorMessage, ipc } from '../../lib/api.js'
import { useExam } from './examContext.js'
import { isAnsweredEntry, progressOf } from './examReducer.js'
import { ExamChrome } from './ExamRoom.jsx'
import styles from './Exam.module.css'

/** First line of the question text, without code fences, for the list. */
const stem = (text) => String(text ?? '').replace(/```[\s\S]*?```/g, '').split('\n').find((line) => line.trim())?.trim() ?? ''

/** `kind` picks the rail shape: 'marked' (accent ring) or 'todo' (hollow). */
function Row({ index, question, answered, kind, onGo }) {
  return (
    <li className={`${styles.reviewRow} ${styles[`rail_${kind}`]}`}>
      <span className={styles.railMark} aria-hidden="true" />
      <span className={styles.reviewNo}>Q{index + 1}</span>
      <span className={styles.reviewStem}>{stem(question.text)}</span>
      <span className={styles.reviewState}>{answered ? 'answered' : 'not answered'}</span>
      <Button variant="ghost" onClick={onGo} aria-label={`Go to question ${index + 1}`}>
        Go <ChevronRight size={14} aria-hidden="true" />
      </Button>
    </li>
  )
}

export function ReviewPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useExam()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [waiting, setWaiting] = useState(false)

  if (state.status !== 'ready') return <div className={styles.loading} aria-busy="true" />

  const { answered, marked, total } = progressOf(state)
  const indexed = state.questions.map((question, index) => ({ question, index, entry: state.answers[question.id] }))
  const markedRows = indexed.filter((row) => row.entry?.marked)
  const unanswered = indexed.filter((row) => !isAnsweredEntry(row.entry))
  const go = (index) => {
    actions.go(index)
    navigate(`/student/attempts/${attemptId}`)
  }

  /** `confirmed` skips the native dialog on "Keep trying" (SCREENS C12). */
  const submit = async (confirmed) => {
    setError(null)
    if (!confirmed && !(await ipc.confirmSubmit({ answered, total, marked }))) return
    setSubmitting(true)
    try {
      await api('attempts.submit', { attemptId })
      navigate(`/student/attempts/${attemptId}/done`, { replace: true })
    } catch (caught) {
      setSubmitting(false)
      if (caught.code === 'ANSWERS_PENDING') setWaiting(true)
      else if (['ATTEMPT_NOT_ACTIVE', 'TIME_UP'].includes(caught.code)) navigate(`/student/attempts/${attemptId}/done`, { replace: true })
      else setError(caught)
    }
  }

  return (
    <ExamChrome state={state}>
      <div className={styles.reviewWrap}>
        <section className={styles.review} aria-labelledby="review-title">
          <h1 id="review-title" className={styles.reviewTitle}>
            Review before you submit
          </h1>
          <p className={styles.reviewMeta}>
            {answered} of {total} answered{marked > 0 && ` · ${marked} marked for review`}
          </p>
          {markedRows.length > 0 && (
            <>
              <h2 className={styles.label}>Marked for review ({markedRows.length})</h2>
              <ul className={styles.reviewList}>
                {markedRows.map(({ question, index, entry }) => (
                  <Row key={question.id} index={index} question={question} answered={isAnsweredEntry(entry)} kind="marked" onGo={() => go(index)} />
                ))}
              </ul>
            </>
          )}
          {unanswered.length > 0 && (
            <>
              <h2 className={styles.label}>Not answered ({unanswered.length})</h2>
              <ul className={styles.reviewList}>
                {unanswered.map(({ question, index }) => (
                  <Row key={question.id} index={index} question={question} answered={false} kind="todo" onGo={() => go(index)} />
                ))}
              </ul>
            </>
          )}
          {markedRows.length === 0 && unanswered.length === 0 && <p className={styles.allDone}>Every question is answered.</p>}
          {waiting && (
            <Banner tone="attention" action={<Button onClick={() => submit(true)} loading={submitting}>Keep trying</Button>}>
              We’re waiting for the connection to send your last answers. Your exam is submitted on the server when time runs
              out, with everything sent so far.
            </Banner>
          )}
          {error && (
            <Banner tone="critical" role="alert">
              {errorMessage(error)}
            </Banner>
          )}
          <div className={styles.reviewActions}>
            <Button variant="ghost" size="lg" icon={ChevronLeft} onClick={() => navigate(`/student/attempts/${attemptId}`)}>
              Back to questions
            </Button>
            <span className={styles.reviewSubmit}>
              <span className={styles.soft}>After you submit, you can’t change your answers.</span>
              <Button variant="primary" size="lg" onClick={() => submit(false)} loading={submitting && !waiting}>
                Submit exam
              </Button>
            </span>
          </div>
        </section>
      </div>
    </ExamChrome>
  )
}
