// The 56 px answer tile used by single, multi and true/false (SCREENS C7): marker, letter, text, key hint.
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
    <label className={`${styles.tile} ${checked ? styles.tileChecked : ''}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} className={styles.tileInput} />
      <span className={`${styles.marker} ${type === 'radio' ? styles.markerRadio : styles.markerCheck}`} aria-hidden="true">
        {type === 'checkbox' && <Check size={12} strokeWidth={3} />}
      </span>
      {letter && (
        <span className={styles.letter} aria-hidden="true">
          {letter}
        </span>
      )}
      <span className={styles.tileText}>
        <CodeText text={text} as="span" />
      </span>
      {keyHint && keyHint <= 9 && (
        <kbd className={styles.keyHint} aria-hidden="true">
          {keyHint}
        </kbd>
      )}
    </label>
  )
}

