// ordering: items typed in the CORRECT order; students get them shuffled.
import { RadioGroup } from '../../../../components/Radio.jsx'
import { ItemList } from '../ItemList.jsx'
import styles from '../Builder.module.css'

const MAX_ITEMS = 8
const SCORING = [
  { value: 'positional', label: 'Positional', description: 'Marks for each item in the right place' },
  { value: 'exact', label: 'Exact', description: 'Full marks only for the whole order' },
]

export function OrderingEditor({ draft, onChange, errors }) {
  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Items in the correct order (shuffled for students)</legend>
        <ItemList
          items={draft.config.items}
          onChange={(items) => onChange({ config: { ...draft.config, items } })}
          prefix="it"
          noun="Item"
          errors={errors}
          errorPath="config.items"
          max={MAX_ITEMS}
          movable
          marker={(_, index) => <span className={styles.keyChoice}>{index + 1}</span>}
        />
        {errors['key.order'] && <p className={styles.fieldError}>{errors['key.order']}</p>}
      </fieldset>
      <RadioGroup
        legend="Scoring"
        name="ordering-scoring"
        inline
        value={draft.config.scoring}
        options={SCORING}
        onChange={(value) => onChange({ config: { ...draft.config, scoring: value } })}
      />
    </>
  )
}
