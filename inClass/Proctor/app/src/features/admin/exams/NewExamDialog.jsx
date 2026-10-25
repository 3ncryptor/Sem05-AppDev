// A2a New exam dialog: title, code, description, and either a blank exam or a copy of another one.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Input } from '../../../components/Input.jsx'
import { RadioGroup } from '../../../components/Radio.jsx'
import { Select } from '../../../components/Select.jsx'
import { Textarea } from '../../../components/Textarea.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { useMutation } from '../../../lib/useApi.js'
import styles from './Exams.module.css'

const START_OPTIONS = [
  { value: 'blank', label: 'Blank' },
  { value: 'copy', label: 'Copy of another exam' },
]

function initialForm(copyFrom) {
  return {
    title: copyFrom ? `${copyFrom.title} (copy)` : '',
    code: '',
    description: '',
    start: copyFrom ? 'copy' : 'blank',
    copyFromId: copyFrom?.id ?? '',
  }
}

function payloadOf(form) {
  return {
    title: form.title.trim(),
    description: form.description,
    ...(form.code.trim() ? { code: form.code.trim().toUpperCase() } : {}),
    ...(form.start === 'copy' && form.copyFromId ? { copyFromId: form.copyFromId } : {}),
  }
}

/**
 * Mount it only while open, so each opening starts from a fresh form.
 * @param {{ exams: { id: string, title: string }[], copyFrom?: { id: string, title: string } | null, onClose: () => void }} props
 */
export function NewExamDialog({ exams, copyFrom = null, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useMutation('admin.exams.create')
  const [form, setForm] = useState(() => initialForm(copyFrom))
  const [fields, setFields] = useState({})
  const [formError, setFormError] = useState(null)
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  const sourceOptions = exams.map((exam) => ({ value: exam.id, label: exam.title }))

  const submit = async (event) => {
    event.preventDefault()
    setFields({})
    setFormError(null)
    try {
      const { exam } = await create.run(payloadOf(form))
      toast(`Created ${exam.title}`, { tone: 'ok' })
      navigate(`/admin/exams/${exam.id}/questions`)
    } catch (error) {
      setFields(error?.fields ?? {})
      if (!error?.fields) setFormError(errorMessage(error))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New exam"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-exam" loading={create.loading} disabled={!form.title.trim()}>
            Create exam
          </Button>
        </>
      }
    >
      <form id="new-exam" className={styles.form} onSubmit={submit}>
        {formError && <Banner tone="critical" role="alert">{formError}</Banner>}
        <Input label="Title" value={form.title} onChange={set('title')} error={fields.title} maxLength={120} required autoFocus />
        <Input
          label="Code"
          value={form.code}
          onChange={set('code')}
          error={fields.code}
          hint="Short, shown on receipts. Leave empty to make one from the title."
          maxLength={16}
          mono
        />
        <Textarea label="Description" value={form.description} onChange={set('description')} error={fields.description} rows={3} />
        <RadioGroup
          legend="Start from"
          name="start"
          inline
          value={form.start}
          onChange={(start) => setForm((prev) => ({ ...prev, start, copyFromId: prev.copyFromId || exams[0]?.id || '' }))}
          options={exams.length ? START_OPTIONS : START_OPTIONS.slice(0, 1)}
        />
        {form.start === 'copy' && (
          <Select label="Exam to copy" value={form.copyFromId} onChange={set('copyFromId')} options={sourceOptions} error={fields.copyFromId} />
        )}
      </form>
    </Dialog>
  )
}
