import { letterFor } from '../../letters.js'
import { OptionTile } from '../../OptionTile.jsx'
import styles from '../../Question.module.css'

/** single: pick one. Response `{ optionId }`. */
export function SingleAnswer({ question, response, onChange, labelId }) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className={styles.tiles}>
      {question.config.options.map((option, index) => (
        <OptionTile
          key={option.id}
          type="radio"
          name={question.id}
          letter={letterFor(index)}
          text={option.text}
          keyHint={index + 1}
          checked={response?.optionId === option.id}
          onChange={() => onChange({ optionId: option.id })}
        />
      ))}
    </div>
  )
}
