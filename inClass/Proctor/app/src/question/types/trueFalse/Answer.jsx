import { OptionTile } from '../../OptionTile.jsx'
import styles from '../../Question.module.css'

import { CHOICES } from './choices.js'

/** true_false: Response `{ value }`. */
export function TrueFalseAnswer({ question, response, onChange, labelId }) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className={`${styles.tiles} ${styles.tilesRow}`}>
      {CHOICES.map((choice, index) => (
        <OptionTile
          key={choice.label}
          type="radio"
          name={question.id}
          text={choice.label}
          keyHint={index + 1}
          checked={response?.value === choice.value}
          onChange={() => onChange({ value: choice.value })}
        />
      ))}
    </div>
  )
}
