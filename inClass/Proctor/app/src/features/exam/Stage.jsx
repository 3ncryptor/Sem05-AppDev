// C7 stage: a 720 px column with "Question 4 of 12 · 2 marks", the stem in serif, the answer, Clear answer;
// then the bottom bar: Previous (ghost), Mark for review (ghost toggle), Next (primary).
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { QuestionView } from '../../question/QuestionView.jsx'
import { isAnsweredEntry } from './examReducer.js'
import styles from './Exam.module.css'

const MarkedIcon = (props) => <Bookmark {...props} fill="currentColor" />

export function Stage({ state, actions, attemptId }) {
  const navigate = useNavigate()
  const question = state.questions[state.index]
  if (!question) return null
  const entry = state.answers[question.id]
  const isLast = state.index === state.questions.length - 1
  const marked = Boolean(entry?.marked)

  return (
    <section className={styles.stage} aria-labelledby="question-heading">
      <div className={styles.stageScroll}>
        <div key={question.id} className={styles.stageInner}>
          <div className={styles.stageMeta}>
            <h1 id="question-heading" className={styles.questionNo}>
              Question {state.index + 1} of {state.questions.length}
            </h1>
            <span aria-hidden="true">·</span>
            <span>
              {question.marks} mark{question.marks === 1 ? '' : 's'}
            </span>
            {marked && (
              <>
                <span aria-hidden="true">·</span>
                <span className={styles.metaMarked}>Marked for review</span>
              </>
            )}
          </div>
          <QuestionView question={question} response={entry?.response ?? null} onChange={(response) => actions.answer(question.id, response)} />
          {isAnsweredEntry(entry) && (
            <button type="button" className={styles.clear} onClick={() => actions.answer(question.id, null)}>
              Clear answer
            </button>
          )}
        </div>
      </div>
      <div className={styles.stageNav}>
        <div className={styles.stageNavInner}>
          <Button variant="ghost" size="lg" icon={ChevronLeft} onClick={actions.previous} disabled={state.index === 0}>
            Previous
          </Button>
          <p className={styles.keyLegend} aria-hidden="true">
            <kbd>1</kbd>–<kbd>9</kbd> choose · <kbd>N</kbd> <kbd>P</kbd> move · <kbd>M</kbd> mark · <kbd>Q</kbd> questions
          </p>
          <span className={styles.stageNavRight}>
            <Button
              variant="ghost"
              size="lg"
              className={`${styles.markButton} ${marked ? styles.marked : ''}`}
              aria-pressed={marked}
              icon={marked ? MarkedIcon : Bookmark}
              onClick={() => actions.toggleMark(question.id)}
            >
              {marked ? 'Marked' : 'Mark for review'}
            </Button>
            {isLast ? (
              <Button variant="primary" size="lg" onClick={() => navigate(`/student/attempts/${attemptId}/review`)}>
                Review &amp; submit
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={actions.next}>
                Next <ChevronRight size={16} aria-hidden="true" />
              </Button>
            )}
          </span>
        </div>
      </div>
    </section>
  )
}
