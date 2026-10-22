// Checkbox, Radio and Switch are real <input>s with custom visuals, so labels, Space and screen readers just work.
import { Check } from 'lucide-react'
import styles from './Choice.module.css'

/** @param {{ label: import('react').ReactNode, description?: string } & import('react').InputHTMLAttributes<HTMLInputElement>} props */
export function Checkbox({ label, description, className = '', ...rest }) {
  return (
    <label className={`${styles.choice} ${className}`}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span className={`${styles.box} ${styles.checkbox}`} aria-hidden="true">
        <Check size={12} strokeWidth={3} />
      </span>
      <span className={styles.text}>
        <span>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  )
}
