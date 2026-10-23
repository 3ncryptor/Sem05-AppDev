// matching: a plain <select> per left item, so it works from the keyboard. Response `{ pairs: { leftId: rightId|null } }`.
import { useId } from 'react'
import { CodeText } from '../../CodeText.jsx'
import styles from '../../Question.module.css'

export function MatchingAnswer({ question, response, onChange }) {
  const baseId = useId()
  const { left, right } = question.config
  const pairs = response?.pairs ?? {}

  const choose = (leftId, rightId) => {
    const next = Object.fromEntries(left.map((item) => [item.id, item.id === leftId ? rightId || null : (pairs[item.id] ?? null)]))
    onChange(Object.values(next).some(Boolean) ? { pairs: next } : null)
  }

  return (
    <div>
      <p className={styles.helper}>Match each item on the left</p>
      <div className={styles.matchGrid}>
        {left.map((item, index) => (
          <div key={item.id} className={styles.matchRow}>
            <label htmlFor={`${baseId}-${index}`} className={styles.matchLeft}>
              <CodeText text={item.text} as="span" />
            </label>
            <span className={styles.matchDash} aria-hidden="true">
              ──
            </span>
            <select
              id={`${baseId}-${index}`}
              className={styles.select}
              value={pairs[item.id] ?? ''}
              onChange={(event) => choose(item.id, event.target.value)}
            >
              <option value="">Choose…</option>
              {right.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {right.length > left.length && (
        <p className={styles.helper}>
          {right.length - left.length === 1 ? 'One option may be left over.' : `${right.length - left.length} options may be left over.`}
        </p>
      )}
    </div>
  )
}
