// multi: options, any number correct (checkboxes), scored all-or-nothing or partially.
import { RadioGroup } from '../../../../components/Radio.jsx'
import { letterFor } from '../../../../question/letters.js'
import { ItemList } from '../ItemList.jsx'
import styles from '../Builder.module.css'

const MAX_OPTIONS = 8
const SCORING = [
  { value: 'all_or_nothing', label: 'All or nothing' },
  { value: 'partial', label: 'Partial', description: 'Right picks minus wrong picks, never below 0' },
]

export function MultiEditor({ draft, onChange, errors }) {
  const { options, scoring } = draft.config
  const correct = draft.key.optionIds

  const setOptions = (next) => {
    const ids = next.map((option) => option.id)
    onChange({ config: { ...draft.config, options: next }, key: { optionIds: correct.filter((id) => ids.includes(id)) } })
  }
  const toggle = (id) => {
    const next = correct.includes(id) ? correct.filter((other) => other !== id) : [...correct, id]
    onChange({ key: { optionIds: next } })
  }

  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Options · tick every correct one</legend>
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
                type="checkbox"
                checked={correct.includes(option.id)}
                onChange={() => toggle(option.id)}
                aria-label={`Option ${letterFor(index)} is correct`}
              />
              {letterFor(index)}
            </label>
          )}
        />
        {errors['key.optionIds'] && <p className={styles.fieldError}>{errors['key.optionIds']}</p>}
      </fieldset>
      <RadioGroup
        legend="Scoring"
        name="multi-scoring"
        inline
        value={scoring}
        options={SCORING}
        onChange={(value) => onChange({ config: { ...draft.config, scoring: value } })}
      />
    </>
  )
}
