// ordering: put items in order with ↑/↓ buttons, ⌥↑/⌥↓ on a focused row, or drag. Response `{ order }`.
// It works fully without drag (BUILD_PLAN §5.4 accessibility).
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useRef, useState } from 'react'
import { CodeText } from '../../CodeText.jsx'
import styles from '../../Question.module.css'

/** Returns a new array with the item at `from` moved to `to`. */
function moved(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list
  const without = list.filter((_, index) => index !== from)
  return [...without.slice(0, to), list[from], ...without.slice(to)]
}

export function OrderingAnswer({ question, response, onChange, labelId }) {
  const items = question.config.items
  const order = response?.order ?? items.map((item) => item.id)
  const byId = new Map(items.map((item) => [item.id, item]))
  const [dragFrom, setDragFrom] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const rows = useRef([])

  const move = (from, to) => {
    const next = moved(order, from, to)
    if (next === order) return
    onChange({ order: next })
    setAnnouncement(`Moved to position ${to + 1} of ${order.length}`)
    // Keep focus on the row that moved, so repeated ⌥↓ keeps moving it.
    requestAnimationFrame(() => rows.current[to]?.focus())
  }

  const onKeyDown = (event, index) => {
    if (!event.altKey) return
    if (event.key === 'ArrowUp') move(index, index - 1)
    else if (event.key === 'ArrowDown') move(index, index + 1)
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div>
      <p className={styles.helper}>Put these in order (top = first)</p>
      <ol className={styles.orderList} aria-labelledby={labelId}>
        {order.map((id, index) => (
          <li
            key={id}
            ref={(node) => {
              rows.current[index] = node
            }}
            tabIndex={0}
            draggable
            className={`${styles.orderRow} ${dragFrom === index ? styles.dragging : ''}`}
            onKeyDown={(event) => onKeyDown(event, index)}
            onDragStart={() => setDragFrom(index)}
            onDragEnd={() => setDragFrom(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) move(dragFrom, index)
              setDragFrom(null)
            }}
            aria-label={`Position ${index + 1}`}
          >
            <GripVertical size={16} aria-hidden="true" className={styles.grip} />
            <span className={styles.orderNo}>{index + 1}</span>
            <span className={styles.orderText}>
              <CodeText text={byId.get(id)?.text ?? ''} as="span" />
            </span>
            <button type="button" className={styles.iconButton} onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move up">
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => move(index, index + 1)}
              disabled={index === order.length - 1}
              aria-label="Move down"
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.helper}>Drag a row, or focus it and use ⌥↑ / ⌥↓.</p>
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
