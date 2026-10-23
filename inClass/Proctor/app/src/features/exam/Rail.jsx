// C7 left rail: one button per question with a distinct shape per state (never colour alone).
import { progressOf, questionState } from './examReducer.js'
import { SHAPES, STATE_WORDS } from './railShapes.js'
import styles from './Exam.module.css'

export function Rail({ state, onGo }) {
  const { answered, total } = progressOf(state)
  return (
    <nav className={styles.rail} aria-label="Questions">
      <ol className={styles.railList}>
        {state.questions.map((question, index) => {
          const kind = questionState(state, question, index)
          return (
            <li key={question.id}>
              <button
                type="button"
                className={`${styles.railItem} ${styles[`rail_${kind}`]}`}
                onClick={() => onGo(index)}
                aria-current={kind === 'current' ? 'step' : undefined}
                aria-label={`Question ${index + 1}, ${STATE_WORDS[kind]}`}
              >
                <span aria-hidden="true">{SHAPES[kind]}</span>
                <span aria-hidden="true">{index + 1}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className={styles.railCount}>
        {answered}
        <br />
        of {total}
      </p>
    </nav>
  )
}
