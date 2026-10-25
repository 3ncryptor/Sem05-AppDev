// single: options with one correct answer (radio in front of each option).
import { letterFor } from '../../../../question/letters.js'
import { ItemList } from '../ItemList.jsx'
import styles from '../Builder.module.css'

const MAX_OPTIONS = 8

export function SingleEditor({ draft, onChange, errors }) {
  const { options } = draft.config
  const correct = draft.key.optionId

  const setOptions = (next) => {
    const stillThere = next.some((option) => option.id === correct)
    onChange({ config: { ...draft.config, options: next }, key: { optionId: stillThere ? correct : null } })
  }

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Options · pick the correct one</legend>
      <ItemList
        items={options}
        onChange={setOptions}
        prefix="op"
        noun="Option"
        errors={errors}
        errorPath="config.options"
        max={MAX_OPTIONS}
        marker={(option, index) => (
          <label className={styles.keyChoice}>
            <input
              type="radio"
              name="single-key"
              checked={option.id === correct}
              onChange={() => onChange({ key: { optionId: option.id } })}
              aria-label={`Option ${letterFor(index)} is correct`}
            />
            {letterFor(index)}
          </label>
        )}
      />
      {errors['key.optionId'] && <p className={styles.fieldError}>{errors['key.optionId']}</p>}
    </fieldset>
  )
}
