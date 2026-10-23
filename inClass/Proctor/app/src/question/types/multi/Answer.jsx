import { letterFor } from '../../letters.js'
import { OptionTile } from '../../OptionTile.jsx'
import styles from '../../Question.module.css'
import { ordered, toggle } from './selection.js'


/** multi: pick all that apply. Response `{ optionIds }`; none picked → null. */
export function MultiAnswer({ question, response, onChange, labelId }) {
  const selected = response?.optionIds ?? []
  const pick = (id) => {
    const next = ordered(question, toggle(selected, id))
    onChange(next.length ? { optionIds: next } : null)
  }
  return (
    <div>
      <div role="group" aria-labelledby={labelId} className={styles.tiles}>
        {question.config.options.map((option, index) => (
          <OptionTile
            key={option.id}
            type="checkbox"
            name={question.id}
            letter={letterFor(index)}
            text={option.text}
            keyHint={index + 1}
            checked={selected.includes(option.id)}
            onChange={() => pick(option.id)}
          />
        ))}
      </div>
      <p className={styles.helper}>Choose all that apply · {selected.length} selected</p>
    </div>
  )
}
