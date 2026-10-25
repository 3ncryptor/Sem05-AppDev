// Confirms deleting a draft by typing its name (SCREENS A2 row menu, A5 danger zone).
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Input } from '../../../components/Input.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { useMutation } from '../../../lib/useApi.js'

/**
 * Mount it only while open.
 * @param {{ exam: { id: string, title: string }, onClose: () => void, onDeleted: () => void }} props
 */
export function DeleteExamDialog({ exam, onClose, onDeleted }) {
  const toast = useToast()
  const remove = useMutation('admin.exams.delete')
  const [typed, setTyped] = useState('')
  const [failure, setFailure] = useState(null)

  const confirm = async () => {
    setFailure(null)
    try {
      await remove.run({ examId: exam.id })
      toast(`Deleted ${exam.title}`, { tone: 'ok' })
      onDeleted()
    } catch (error) {
      setFailure(errorMessage(error))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Delete ${exam.title}?`}
      description="The draft and its questions are removed for good."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={confirm} loading={remove.loading} disabled={typed.trim() !== exam.title}>
            Delete draft
          </Button>
        </>
      }
    >
      {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
      <Input label={`Type "${exam.title}" to confirm`} value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
    </Dialog>
  )
}
