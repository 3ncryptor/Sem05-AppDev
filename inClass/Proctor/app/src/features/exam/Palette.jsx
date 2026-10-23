// C8 question palette: opens with Q over the stage's left edge; filters, a grid and the legend. Esc or Q closes.
import { useState } from 'react'
import { isAnsweredEntry, progressOf, questionState } from './examReducer.js'
import { SHAPES, STATE_WORDS } from './railShapes.js'
import styles from './Exam.module.css'

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'unanswered', label: 'Unanswered', match: (entry) => !isAnsweredEntry(entry) },
  { id: 'marked', label: 'Marked', match: (entry) => Boolean(entry?.marked) },
]

export function Palette({ state, onGo }) {
  const [filter, setFilter] = useState('all')
  const { answered, total } = progressOf(state)
  const active = FILTERS.find((f) => f.id === filter)
  return (
    <aside className={styles.palette} aria-label="Question palette">
      <div className={styles.paletteHead}>
        <h2 className={styles.paletteTitle}>Questions</h2>
        <span className={styles.soft}>
          {answered} of {total} answered
        </span>
      </div>
      <div className={styles.paletteFilters} role="group" aria-label="Show">
        {FILTERS.map((f) => {
          const count = state.questions.filter((q) => f.match(state.answers[q.id])).length
          return (
            <button key={f.id} type="button" aria-pressed={filter === f.id} className={styles.paletteFilter} onClick={() => setFilter(f.id)}>
              {f.label}
              {f.id !== 'all' && ` ${count}`}
            </button>
          )
        })}
      </div>
      <div className={styles.paletteGrid}>
        {state.questions.map((question, index) => {
          if (!active.match(state.answers[question.id])) return null
          const kind = questionState(state, question, index)
          return (
            <button
              key={question.id}
              type="button"
              className={`${styles.paletteItem} ${styles[`rail_${kind}`]}`}
              onClick={() => onGo(index)}
              aria-label={`Question ${index + 1}, ${STATE_WORDS[kind]}`}
            >
              <span aria-hidden="true">{SHAPES[kind]}</span> {index + 1}
            </button>
          )
        })}
      </div>
      <p className={styles.legend}>
        {Object.entries(SHAPES).map(([kind, shape]) => (
          <span key={kind}>
            {shape} {STATE_WORDS[kind]}
          </span>
        ))}
      </p>
    </aside>
  )
}
