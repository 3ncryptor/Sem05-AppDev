// C7 stage: "Question 4 of 12 · 2 marks · ☆ Mark", the question, Clear answer, Previous / Next.
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { QuestionView } from '../../question/QuestionView.jsx'
import { isAnsweredEntry } from './examReducer.js'
import styles from './Exam.module.css'

export function Stage({ state, actions, attemptId }) {
  const navigate = useNavigate()
  const question = state.questions[state.index]
  if (!question) return null
  const entry = state.answers[question.id]
  const isLast = state.index === state.questions.length - 1
  const marked = Boolean(entry?.marked)

  return (
    <section className={styles.stage} aria-labelledby="question-heading">
      <div key={question.id} className={styles.stageInner}>
        <div className={styles.stageHead}>
          <h1 id="question-heading" className={styles.questionNo}>
            Question {state.index + 1} of {state.questions.length}
          </h1>
          <span className={styles.marks}>
            {question.marks} mark{question.marks === 1 ? '' : 's'}
          </span>
          <button type="button" className={`${styles.markButton} ${marked ? styles.marked : ''}`} aria-pressed={marked} onClick={() => actions.toggleMark(question.id)}>
            <Star size={15} aria-hidden="true" fill={marked ? 'currentColor' : 'none'} /> {marked ? 'Marked' : 'Mark'}
          </button>
        </div>
        <QuestionView question={question} response={entry?.response ?? null} onChange={(response) => actions.answer(question.id, response)} />
        {isAnsweredEntry(entry) && (
          <button type="button" className={styles.clear} onClick={() => actions.answer(question.id, null)}>
            Clear answer
          </button>
        )}
      </div>
      <div className={styles.stageNav}>
        <Button variant="ghost" icon={ChevronLeft} onClick={actions.previous} disabled={state.index === 0}>
          Previous
        </Button>
        {isLast ? (
          <Button variant="primary" onClick={() => navigate(`/student/attempts/${attemptId}/review`)}>
            Review &amp; submit
          </Button>
        ) : (
          <Button onClick={actions.next}>
            Next <ChevronRight size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  )
}
