import { useId } from 'react'
import { Field } from './Field.jsx'
import { describedBy } from './fieldIds.js'
import styles from './Field.module.css'

/** @param {{ label?: string, hint?: string, error?: string | null } & import('react').TextareaHTMLAttributes<HTMLTextAreaElement>} props */
export function Textarea({ label, hint, error, id, className = '', ...rest }) {
  const autoId = useId()
  const textareaId = id ?? autoId
  return (
    <Field id={textareaId} label={label} hint={hint} error={error}>
      <textarea
        id={textareaId}
        className={`${styles.control} ${styles.textarea} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(textareaId, { hint, error })}
        {...rest}
      />
    </Field>
  )
}
