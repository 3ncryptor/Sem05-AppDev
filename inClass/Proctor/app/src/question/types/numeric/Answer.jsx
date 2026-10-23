import { useId, useState } from 'react'
import styles from '../../Question.module.css'
import { useDraft } from '../../useDraft.js'

/** Accepts "-3", "2.5", "1e3". Returns null for anything that isn't a finite number. */
function parseNumber(text) {
  const trimmed = text.trim()
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/** numeric: Response `{ number }`; empty → null. The unit (if any) sits after the box. */
export function NumericAnswer({ question, response, onChange }) {
  const id = useId()
  const [invalid, setInvalid] = useState(false)
  const initial = typeof response?.number === 'number' ? String(response.number) : ''
  const { draft, change, flush } = useDraft(initial, (value) => {
    if (!value.trim()) {
      setInvalid(false)
      onChange(null)
      return
    }
    const number = parseNumber(value)
    setInvalid(number === null)
    if (number !== null) onChange({ number })
  })
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        Your answer
      </label>
      <div className={styles.inputRow}>
        <input
          id={id}
          className={`${styles.input} ${styles.mono} ${styles.numberInput}`}
          value={draft}
          inputMode="decimal"
          autoComplete="off"
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
        {question.config.unit && <span className={styles.unit}>{question.config.unit}</span>}
      </div>
      {invalid && (
        <p id={`${id}-error`} className={styles.error}>
          Enter a number, like 0, 2.5 or -3.
        </p>
      )}
    </div>
  )
}
