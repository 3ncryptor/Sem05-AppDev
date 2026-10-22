import { useId } from 'react'
import { Field } from './Field.jsx'
import { describedBy } from './fieldIds.js'
import styles from './Field.module.css'

/**
 * Text input with label, hint and error. `trailing` places a small control inside the right edge (e.g. show password).
 * @param {{ label?: string, hint?: string, error?: string | null, hideLabel?: boolean, size?: 'md' | 'lg', mono?: boolean,
 *           trailing?: import('react').ReactNode } & import('react').InputHTMLAttributes<HTMLInputElement>} props
 */
export function Input({ label, hint, error, hideLabel, size = 'md', mono = false, trailing, id, className = '', ...rest }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const classes = [styles.control, size === 'lg' ? styles.large : '', mono ? styles.mono : '', className].join(' ')
  const input = (
    <input
      id={inputId}
      className={classes}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(inputId, { hint, error })}
      {...rest}
    />
  )
  return (
    <Field id={inputId} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      {trailing ? (
        <div className={styles.withTrailing}>
          {input}
          <div className={styles.trailing}>{trailing}</div>
        </div>
      ) : (
        input
      )}
    </Field>
  )
}
