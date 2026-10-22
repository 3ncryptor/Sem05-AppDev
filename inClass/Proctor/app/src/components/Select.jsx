import { useId } from 'react'
import { Field } from './Field.jsx'
import { describedBy } from './fieldIds.js'
import styles from './Field.module.css'

/**
 * A native <select>, so it's keyboard-operable for free (BUILD_PLAN §5.4 uses it for matching questions).
 * @param {{ label?: string, hint?: string, error?: string | null, options: { value: string, label: string }[] }
 *          & import('react').SelectHTMLAttributes<HTMLSelectElement>} props
 */
export function Select({ label, hint, error, options, id, className = '', ...rest }) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} hint={hint} error={error}>
      <select
        id={selectId}
        className={`${styles.control} ${styles.select} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(selectId, { hint, error })}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
