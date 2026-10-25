// Left side of A10: every attempt of the exam (student, status, score); one is selected.
import { Chip } from '../../../components/Chip.jsx'
import { ATTEMPT_STATUS } from '../../../lib/status.js'
import { attemptStatusKey, percentText } from '../results/resultsModel.js'
import styles from './Review.module.css'

export function AttemptList({ rows, selectedId, onSelect }) {
  return (
    <ul className={styles.list} aria-label="Attempts">
      {rows.map((row) => (
        <li key={row.attemptId}>
          <button
            type="button"
            className={styles.listItem}
            aria-current={row.attemptId === selectedId ? 'true' : undefined}
            onClick={() => onSelect(row.attemptId)}
          >
            <span className={styles.listTop}>
              <span className={styles.listName}>{row.student.name}</span>
              <span className={styles.listScore}>{percentText(row.percent)}</span>
            </span>
            <span className={styles.listBottom}>
              <span className={styles.muted}>{row.student.rollNo}</span>
              <Chip spec={ATTEMPT_STATUS[attemptStatusKey(row)]} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
