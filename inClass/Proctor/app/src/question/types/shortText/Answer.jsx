import { useId } from 'react'
import styles from '../../Question.module.css'
import { useDraft } from '../../useDraft.js'

/** short_text: Response `{ text }`; empty → null. Never matched with regex on the server. */
export function ShortTextAnswer({ question, response, onChange }) {
  const id = useId()
  const max = question.config.maxChars ?? 100
  const { draft, change, flush } = useDraft(response?.text ?? '', (value) => onChange(value.trim() ? { text: value } : null))
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        Your answer
      </label>
      <div className={styles.inputRow}>
        <input
          id={id}
          className={`${styles.input} ${styles.mono}`}
          value={draft}
          maxLength={max}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          aria-describedby={question.config.caseSensitive ? `${id}-hint` : undefined}
        />
        <span className={styles.counter} aria-live="off">
          {draft.length} / {max}
        </span>
      </div>
      {question.config.caseSensitive && (
        <p id={`${id}-hint`} className={styles.helper}>
          Exact spelling matters for this question.
        </p>
      )}
    </div>
  )
}
