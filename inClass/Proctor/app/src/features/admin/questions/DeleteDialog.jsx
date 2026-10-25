// Confirms deleting a question.
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'

export function DeleteDialog({ index, busy, onConfirm, onClose }) {
  return (
    <Dialog
      open={index !== null}
      onClose={onClose}
      title={`Delete Q${(index ?? 0) + 1}?`}
      description="The question, its key and explanation are removed. This can't be undone."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>Delete question</Button>
        </>
      }
    />
  )
}
