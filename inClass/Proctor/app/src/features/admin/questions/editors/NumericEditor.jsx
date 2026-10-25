// numeric: the correct number, an allowed ± tolerance and an optional unit shown after the box.
import { Input } from '../../../../components/Input.jsx'
import styles from '../Builder.module.css'

export function NumericEditor({ draft, onChange, errors }) {
  const setKey = (field, value) => onChange({ key: { ...draft.key, [field]: value } })
  return (
    <div className={styles.inlineRow}>
      <Input
        label="Answer"
        type="number"
        step="any"
        value={draft.key.answer}
        error={errors['key.answer']}
        onChange={(event) => setKey('answer', event.target.value)}
      />
      <Input
        label="Tolerance ±"
        type="number"
        step="any"
        min={0}
        value={draft.key.tolerance}
        error={errors['key.tolerance']}
        onChange={(event) => setKey('tolerance', event.target.value)}
      />
      <Input
        label="Unit"
        hint="Shown after the box"
        maxLength={20}
        value={draft.config.unit}
        error={errors['config.unit']}
        onChange={(event) => onChange({ config: { unit: event.target.value } })}
      />
    </div>
  )
}
