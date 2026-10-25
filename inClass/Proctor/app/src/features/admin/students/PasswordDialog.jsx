// A8a right: a generated password, shown exactly once, with Copy.
import { Copy } from 'lucide-react'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { useToast } from '../../../components/toastContext.js'
import { copyText } from './studentsModel.js'
import styles from './Students.module.css'

/** @param {{ shown: { name: string, password: string } | null, onClose: () => void }} props */
export function PasswordDialog({ shown, onClose }) {
  const toast = useToast()
  const copy = async () => {
    const copied = await copyText(shown.password)
    toast(copied ? 'Password copied.' : "Couldn't copy. Select it and copy by hand.", { tone: copied ? 'ok' : 'critical' })
  }
  return (
    <Dialog
      open={Boolean(shown)}
      onClose={onClose}
      title={shown ? `Password for ${shown.name}` : ''}
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      {shown && (
        <>
          <div className={styles.secret}>
            <code className={styles.secretValue}>{shown.password}</code>
            <Button icon={Copy} onClick={copy}>Copy</Button>
          </div>
          <p className={styles.muted}>Shown once. Give it to the student; they sign in with it.</p>
        </>
      )}
    </Dialog>
  )
}
