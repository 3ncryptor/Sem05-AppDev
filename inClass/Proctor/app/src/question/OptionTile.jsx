// The 52 px answer row used by single, multi and true/false (DESIGN.md "Exam room"): mono letter left, text,
// key hint right; selected = 1.5 px ink border, sunk fill and a check in place of the key hint.
// It's a real radio or checkbox inside a <label>, so clicks, Space and screen readers all work.
import { Check } from 'lucide-react'
import { CodeText } from './CodeText.jsx'
import styles from './Question.module.css'

/**
 * @param {{ type: 'radio' | 'checkbox', name: string, checked: boolean, onChange: () => void,
 *           letter?: string, text: string, keyHint?: number, disabled?: boolean }} props
 */
export function OptionTile({ type, name, checked, onChange, letter, text, keyHint, disabled = false }) {
  return (
    <label className={`${styles.tile} ${checked ? styles.tileChecked : ''}`} data-type={type}>
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} className={styles.tileInput} />
      {letter && (
        <span className={styles.letter} aria-hidden="true">
          {letter}
        </span>
      )}
      <span className={styles.tileText}>
        <CodeText text={text} as="span" />
      </span>
      {checked ? (
        <Check size={16} aria-hidden="true" className={styles.tileCheck} />
      ) : (
        keyHint &&
        keyHint <= 9 && (
          <kbd className={styles.keyHint} aria-hidden="true">
            {keyHint}
          </kbd>
        )
      )}
    </label>
  )
}
