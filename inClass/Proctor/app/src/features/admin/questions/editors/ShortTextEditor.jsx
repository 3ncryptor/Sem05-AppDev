// short_text: accepted answers (one per line), case sensitivity and the answer box length.
import { Checkbox } from '../../../../components/Checkbox.jsx'
import { Input } from '../../../../components/Input.jsx'
import { Textarea } from '../../../../components/Textarea.jsx'
import styles from '../Builder.module.css'

export function ShortTextEditor({ draft, onChange, errors }) {
  const { accepted, caseSensitive } = draft.key
  return (
    <div className={styles.group}>
      <Textarea
        label="Accepted answers"
        hint="One per line. Extra spaces are ignored; up to 20 answers."
        rows={3}
        spellCheck={false}
        value={accepted.join('\n')}
        error={errors['key.accepted']}
        onChange={(event) => onChange({ key: { ...draft.key, accepted: event.target.value.split('\n') } })}
      />
      <div className={styles.inlineRow}>
        <Checkbox
          label="Case-sensitive"
          checked={caseSensitive}
          onChange={(event) => onChange({ key: { ...draft.key, caseSensitive: event.target.checked } })}
        />
        <div className={styles.narrow}>
          <Input
            label="Max characters"
            type="number"
            min={1}
            max={100}
            value={draft.config.maxChars}
            error={errors['config.maxChars']}
            onChange={(event) => onChange({ config: { maxChars: event.target.value } })}
          />
        </div>
      </div>
    </div>
  )
}
