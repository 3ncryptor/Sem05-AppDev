// A4a: the "Add a question" type picker.
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { TYPE_META, TYPE_ORDER } from './typeMeta.js'
import styles from './Builder.module.css'

export function TypePicker({ open, busy, onPick, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a question" footer={<Button onClick={onClose}>Cancel</Button>}>
      <div className={styles.typeGrid}>
        {TYPE_ORDER.map((type) => (
          <button key={type} type="button" className={styles.typeCard} disabled={busy} onClick={() => onPick(type)}>
            <span className={styles.typeName}>
              <span aria-hidden="true">{TYPE_META[type].symbol}</span> {TYPE_META[type].label}
            </span>
            <span className={styles.typeHint}>{TYPE_META[type].hint}</span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
