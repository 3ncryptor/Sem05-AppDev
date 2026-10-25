// A8a left: add one student. The password is generated unless the examiner sets one.
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Input } from '../../../components/Input.jsx'
import { RadioGroup } from '../../../components/Radio.jsx'
import { errorMessage } from '../../../lib/api.js'
import { useMutation } from '../../../lib/useApi.js'
import styles from './Students.module.css'

const EMPTY = Object.freeze({ rollNo: '', name: '', mode: 'generate', password: '' })
const MIN_PASSWORD = 8
const PASSWORD_MODES = [
  { value: 'generate', label: 'Generate one' },
  { value: 'set', label: 'Set it myself' },
]

function localErrors(form) {
  const errors = {}
  if (form.rollNo.trim().length < 2) errors.rollNo = 'At least 2 characters'
  if (!form.name.trim()) errors.name = 'Enter a name'
  if (form.mode === 'set' && form.password.length < MIN_PASSWORD) errors.password = `At least ${MIN_PASSWORD} characters`
  return errors
}

/** @param {{ open: boolean, onClose: () => void, onCreated: (result: { user: object, password: string | null }) => void }} props */
export function AddStudentDialog({ open, onClose, onCreated }) {
  const { run, loading } = useMutation('admin.users.create')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const close = () => {
    setForm(EMPTY)
    setErrors({})
    setFailure(null)
    onClose()
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = localErrors(form)
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length > 0) return
    const body = { rollNo: form.rollNo.trim(), name: form.name.trim(), ...(form.mode === 'set' ? { password: form.password } : {}) }
    try {
      const result = await run(body)
      close()
      onCreated(result)
    } catch (caught) {
      if (caught.fields) setErrors(caught.fields)
      else setFailure(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add student"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-student" loading={loading}>Add</Button>
        </>
      }
    >
      <form id="add-student" onSubmit={submit} noValidate className={styles.form}>
        {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
        <Input label="Roll number" value={form.rollNo} onChange={set('rollNo')} error={errors.rollNo} mono autoFocus maxLength={32} />
        <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
        <RadioGroup
          legend="Password"
          name="password-mode"
          value={form.mode}
          onChange={(mode) => setForm((current) => ({ ...current, mode }))}
          options={PASSWORD_MODES}
        />
        {form.mode === 'set' && (
          <Input label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} maxLength={64} autoComplete="new-password" />
        )}
      </form>
    </Dialog>
  )
}
