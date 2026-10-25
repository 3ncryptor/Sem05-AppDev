// true_false: the statement is the question text; the key is true or false.
import { RadioGroup } from '../../../../components/Radio.jsx'
import styles from '../Builder.module.css'

const CHOICES = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
]

export function TrueFalseEditor({ draft, onChange, errors }) {
  const value = draft.key.value === null || draft.key.value === undefined ? '' : String(draft.key.value)
  return (
    <div>
      <RadioGroup
        legend="Correct answer"
        name="tf-key"
        inline
        value={value}
        options={CHOICES}
        onChange={(next) => onChange({ key: { value: next === 'true' } })}
      />
      {errors['key.value'] && <p className={styles.fieldError}>{errors['key.value']}</p>}
    </div>
  )
}
