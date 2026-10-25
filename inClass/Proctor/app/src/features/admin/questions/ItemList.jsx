// An editable list of { id, text } rows: options, ordering items, matching extras.
// `marker` draws the correct-answer control in front of a row (radio, checkbox or a number).
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button } from '../../../components/Button.jsx'
import { Input } from '../../../components/Input.jsx'
import { moved, newItem, withText, without } from './items.js'
import styles from './Builder.module.css'

/**
 * @param {{ items: { id: string, text: string }[], onChange: (items: { id: string, text: string }[]) => void,
 *           prefix: 'op' | 'it' | 'rt', noun: string, errors: Record<string, string>, errorPath: string,
 *           marker: (item: { id: string, text: string }, index: number) => import('react').ReactNode,
 *           max: number, movable?: boolean }} props
 */
export function ItemList({ items, onChange, prefix, noun, errors, errorPath, marker, max, movable = false }) {
  return (
    <div className={styles.itemList}>
      {items.map((item, index) => (
        <div key={item.id} className={styles.itemRow}>
          <span className={styles.marker}>{marker(item, index)}</span>
          <div className={styles.grow}>
            <Input
              label={`${noun} ${index + 1}`}
              hideLabel
              value={item.text}
              placeholder={`${noun} ${index + 1}`}
              maxLength={500}
              error={errors[`${errorPath}.${index}.text`]}
              onChange={(event) => onChange(withText(items, item.id, event.target.value))}
            />
          </div>
          {movable && (
            <>
              <Button variant="ghost" icon={ArrowUp} aria-label={`Move ${noun.toLowerCase()} ${index + 1} up`}
                disabled={index === 0} onClick={() => onChange(moved(items, index, index - 1))} />
              <Button variant="ghost" icon={ArrowDown} aria-label={`Move ${noun.toLowerCase()} ${index + 1} down`}
                disabled={index === items.length - 1} onClick={() => onChange(moved(items, index, index + 1))} />
            </>
          )}
          <Button variant="ghost" icon={X} aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`} onClick={() => onChange(without(items, item.id))} />
        </div>
      ))}
      {errors[errorPath] && <p className={styles.fieldError}>{errors[errorPath]}</p>}
      <div>
        <Button variant="ghost" icon={Plus} disabled={items.length >= max} onClick={() => onChange([...items, newItem(prefix)])}>
          Add {noun.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}
