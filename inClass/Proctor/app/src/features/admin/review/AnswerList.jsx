// The attempt's answers, one card per question: result, marks, time, the student's answer and the key.
import { ListChecks } from 'lucide-react'
import { Chip } from '../../../components/Chip.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { CodeText } from '../../../question/CodeText.jsx'
import { formatDuration } from '../results/resultsModel.js'
import { RESULT_CHIP, keyText, responseText } from './reviewModel.js'
import styles from './Review.module.css'

function AnswerCard({ question, no }) {
  return (
    <li className={styles.answer}>
      <div className={styles.answerHead}>
        <span className={styles.answerNo}>Q{no}</span>
        <Chip spec={RESULT_CHIP[question.result] ?? RESULT_CHIP.unanswered} />
        <span className={styles.muted}>
          {question.marksAwarded} / {question.marks} marks · {formatDuration(question.timeSpentSec ?? 0)}
        </span>
      </div>
      <CodeText text={question.text} />
      <dl className={styles.answerRows}>
        <dt>Answer</dt>
        <dd>{responseText(question)}</dd>
        {question.result !== 'correct' && (
          <>
            <dt>Correct</dt>
            <dd>{keyText(question)}</dd>
          </>
        )}
      </dl>
    </li>
  )
}

export function AnswerList({ answers }) {
  if (answers.length === 0) return <EmptyState icon={ListChecks} title="No questions in this attempt" />
  return (
    <ol className={styles.answers}>
      {answers.map((question, index) => (
        <AnswerCard key={question.id} question={question} no={index + 1} />
      ))}
    </ol>
  )
}
