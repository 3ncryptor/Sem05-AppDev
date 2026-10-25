// matching: left items, each with its correct right-side match, plus extra right-side distractors.
// Stored as config.left, config.right and key.pairs { leftId: rightId }; students see the right side shuffled.
import { Plus, X } from 'lucide-react'
import { Button } from '../../../../components/Button.jsx'
import { Input } from '../../../../components/Input.jsx'
import { ItemList } from '../ItemList.jsx'
import { newItem, withText, without } from '../items.js'
import styles from '../Builder.module.css'

const MAX_LEFT = 8
const MAX_RIGHT = 12

function PairRow({ index, leftItem, rightItem, errors, onLeft, onRight, onRemove }) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.grow}>
        <Input label={`Left ${index + 1}`} hideLabel placeholder={`Left ${index + 1}`} maxLength={500} value={leftItem.text}
          error={errors[`config.left.${index}.text`]} onChange={(event) => onLeft(event.target.value)} />
      </div>
      <span className={styles.pairDash} aria-hidden="true">──</span>
      <div className={styles.grow}>
        <Input label={`Correct match for left ${index + 1}`} hideLabel placeholder="Correct match" maxLength={500}
          value={rightItem?.text ?? ''} onChange={(event) => onRight(event.target.value)} />
      </div>
      <Button variant="ghost" icon={X} aria-label={`Remove pair ${index + 1}`} onClick={onRemove} />
    </div>
  )
}

export function MatchingEditor({ draft, onChange, errors }) {
  const { left, right } = draft.config
  const { pairs } = draft.key
  const byId = new Map(right.map((item) => [item.id, item]))
  const pairedIds = new Set(Object.values(pairs))
  const extras = right.filter((item) => !pairedIds.has(item.id))

  const commit = (nextLeft, nextRight, nextPairs) =>
    onChange({ config: { left: nextLeft, right: nextRight }, key: { pairs: nextPairs } })

  const setRightOf = (leftId, text) => {
    const rightId = pairs[leftId]
    if (rightId && byId.has(rightId)) return commit(left, withText(right, rightId, text), pairs)
    const created = newItem('rt', text)
    return commit(left, [...right, created], { ...pairs, [leftId]: created.id })
  }
  const removePair = (leftId) => {
    const { [leftId]: rightId, ...rest } = pairs
    commit(without(left, leftId), rightId ? without(right, rightId) : right, rest)
  }
  const addPair = () => {
    const l = newItem('lt')
    const r = newItem('rt')
    commit([...left, l], [...right, r], { ...pairs, [l.id]: r.id })
  }
  const setExtras = (nextExtras) => commit(left, [...right.filter((item) => pairedIds.has(item.id)), ...nextExtras], pairs)

  return (
    <div className={styles.group}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Left · correct match</legend>
        {left.map((item, index) => (
          <PairRow key={item.id} index={index} leftItem={item} rightItem={byId.get(pairs[item.id])} errors={errors}
            onLeft={(text) => commit(withText(left, item.id, text), right, pairs)}
            onRight={(text) => setRightOf(item.id, text)} onRemove={() => removePair(item.id)} />
        ))}
        {(errors['config.left'] || errors['key.pairs']) && (
          <p className={styles.fieldError}>{errors['config.left'] ?? errors['key.pairs']}</p>
        )}
        <div>
          <Button variant="ghost" icon={Plus} disabled={left.length >= MAX_LEFT || right.length >= MAX_RIGHT} onClick={addPair}>
            Add pair
          </Button>
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Extra right-side options (distractors)</legend>
        <ItemList items={extras} onChange={setExtras} prefix="rt" noun="Extra" errors={{}} errorPath="config.right"
          max={MAX_RIGHT - pairedIds.size} marker={() => null} />
        {errors['config.right'] && <p className={styles.fieldError}>{errors['config.right']}</p>}
      </fieldset>
    </div>
  )
}
