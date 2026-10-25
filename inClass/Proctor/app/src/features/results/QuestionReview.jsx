// One reviewed question for C15: marks, the student's answer next to the key, and the explanation.
import { Card } from '../../components/Card.jsx'
import { CodeText } from '../../question/CodeText.jsx'
import { QUESTION_RESULT, formatMarks, matchingRows, optionRows, orderingRows, typedAnswer } from './reviewModel.js'
import styles from './Results.module.css'

const CHOICE_TYPES = new Set(['single', 'multi', 'true_false'])

function optionTag(row) {
  if (row.mine && row.correct) return '✓ your answer · correct'
  if (row.mine) return '✕ your answer'
  if (row.correct) return '✓ correct answer'
  return null
}

function OptionReview({ question }) {
  return (
    <ul className={styles.options}>
      {optionRows(question).map((row) => (
        <li key={row.id} className={styles.option} data-mine={row.mine}>
          <span className={styles.letter}>{row.letter}</span>
          <CodeText text={row.text} as="span" />
          <span className={styles.tag}>{optionTag(row)}</span>
        </li>
      ))}
    </ul>
  )
}

const mark = (ok) => (ok ? '✓' : '✕')

function OrderingReview({ question }) {
  return (
    <table className={styles.pairTable}>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Your order</th>
          <th scope="col">Correct order</th>
        </tr>
      </thead>
      <tbody>
        {orderingRows(question).map((row) => (
          <tr key={row.position}>
            <td>{row.position}</td>
            <td>
              {row.mine} <span className={styles.tag}>{mark(row.inPlace)}</span>
            </td>
            <td>{row.correct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MatchingReview({ question }) {
  return (
    <table className={styles.pairTable}>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Your match</th>
          <th scope="col">Correct match</th>
        </tr>
      </thead>
      <tbody>
        {matchingRows(question).map((row) => (
          <tr key={row.id}>
            <td>{row.left}</td>
            <td>
              {row.mine} <span className={styles.tag}>{mark(row.right)}</span>
            </td>
            <td>{row.correct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TypedReview({ question }) {
  const { mine, correct } = typedAnswer(question)
  return (
    <dl className={styles.typed}>
      <dt>Your answer</dt>
      <dd>{mine}</dd>
      <dt>{question.type === 'numeric' ? 'Correct answer' : 'Accepted'}</dt>
      <dd>{correct}</dd>
    </dl>
  )
}

function AnswerReview({ question }) {
  if (CHOICE_TYPES.has(question.type)) return <OptionReview question={question} />
  if (question.type === 'ordering') return <OrderingReview question={question} />
  if (question.type === 'matching') return <MatchingReview question={question} />
  return <TypedReview question={question} />
}

/** @param {{ question: object, no: number }} props */
export function QuestionReview({ question, no }) {
  const result = QUESTION_RESULT[question.result] ?? QUESTION_RESULT.unanswered
  return (
    <Card as="li" aria-label={`Question ${no}`}>
      <div className={styles.qHead}>
        <span>
          Q{no} · <span className={styles.qMarks}>{formatMarks(question.marksAwarded)} / {formatMarks(question.marks)} marks</span> ·{' '}
          <span aria-hidden="true">{result.symbol}</span> {result.label}
          {question.marked && ' · marked for review'}
        </span>
        {question.topic && <span>{question.topic}</span>}
      </div>
      <div className={styles.qText}>
        <CodeText text={question.text} />
      </div>
      <AnswerReview question={question} />
      {question.explanation && (
        <details className={styles.explanation}>
          <summary>Explanation</summary>
          <CodeText text={question.explanation} />
        </details>
      )}
    </Card>
  )
}
