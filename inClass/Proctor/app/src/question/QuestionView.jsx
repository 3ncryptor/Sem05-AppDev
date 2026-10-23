// QuestionView (BUILD_PLAN §1 rule 4): the one component that draws a question. `mode="exam"` now;
// preview and review modes arrive with the builder (Phase 6) and results (Phase 8).
import { useId } from 'react'
import { CodeText } from './CodeText.jsx'
import { QUESTION_TYPES } from './types/index.js'
import styles from './Question.module.css'

/**
 * @param {{ question: { id: string, type: string, text: string, config: object }, response: unknown,
 *           onChange: (response: unknown) => void, mode?: 'exam' }} props
 */
export function QuestionView({ question, response, onChange, mode = 'exam' }) {
  const labelId = useId()
  const type = QUESTION_TYPES[question.type]
  return (
    <div className={styles.question} data-mode={mode}>
      <div id={labelId} className={styles.text}>
        <CodeText text={question.text} />
      </div>
      {type ? (
        <type.Answer key={question.id} question={question} response={response} onChange={onChange} labelId={labelId} />
      ) : (
        <p className={styles.error}>This question type ({question.type}) can't be shown.</p>
      )}
    </div>
  )
}
