// Confirms a type change, because the options and the key are cleared (SCREENS §A4).
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { typeLabel } from './typeMeta.js'

export function TypeChangeDialog({ nextType, busy, onConfirm, onClose }) {
  return (
    <Dialog
      open={Boolean(nextType)}
      onClose={onClose}
      title={`Change to ${typeLabel(nextType)}?`}
      description="Options and the key will be cleared. The question text, marks and explanation stay."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={onConfirm}>Change type</Button>
        </>
      }
    />
  )
}
