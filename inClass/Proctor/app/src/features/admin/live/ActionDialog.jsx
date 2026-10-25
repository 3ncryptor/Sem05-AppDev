// A9a: Extend one attempt, Extend everyone writing, or End one attempt. Every action needs a reason.
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Input } from '../../../components/Input.jsx'
import { errorMessage } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useMutation } from '../../../lib/useApi.js'
import { MAX_EXTEND_MINUTES, newEndLabel, parseMinutes, timeOf } from './liveModel.js'
import styles from './Live.module.css'

const DEFAULT_MINUTES = '10'
const REASON_PRESETS = ['Power cut', 'Platform issue', 'Accessibility']

const ROUTES = { extend: 'admin.attempts.extend', extendAll: 'admin.exams.extendInProgress', end: 'admin.attempts.end' }

function copyFor(action, minutes) {
  if (action.kind === 'extendAll') {
    return { title: 'Extend everyone writing', description: `Adds time to ${plural(action.count, 'attempt')} in progress.`, button: minutes ? `Extend ${minutes} min` : 'Extend' }
  }
  const name = action.attempt.student.name
  if (action.kind === 'end') {
    return {
      title: `End ${name}'s exam?`,
      description: 'Their answers so far are submitted and the exam ends on their screen at the next heartbeat (within 10 s).',
      button: 'End exam',
    }
  }
  const end = minutes ? `New end: ${newEndLabel(action.attempt.deadlineAt, minutes)} (was ${timeOf(action.attempt.deadlineAt)})` : undefined
  return { title: `Extend time for ${name}`, description: end, button: minutes ? `Extend ${minutes} min` : 'Extend' }
}

function paramsFor(action, examId, minutes, reason) {
  if (action.kind === 'extendAll') return { examId, minutes, reason }
  if (action.kind === 'extend') return { attemptId: action.attempt.id, minutes, reason }
  return { attemptId: action.attempt.id, reason }
}

/**
 * @param {{ action: { kind: 'extend' | 'extendAll' | 'end', attempt?: object, count?: number }, examId: string,
 *           onClose: () => void, onDone: (result: object) => void }} props
 */
function ActionForm({ action, examId, onClose, onDone }) {
  const { run, loading } = useMutation(ROUTES[action.kind])
  const [minutesText, setMinutesText] = useState(DEFAULT_MINUTES)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const needsMinutes = action.kind !== 'end'
  const minutes = parseMinutes(minutesText)
  const copy = copyFor(action, minutes)

  const submit = async (event) => {
    event.preventDefault()
    const found = {
      ...(needsMinutes && !minutes ? { minutes: `Whole minutes, 1 to ${MAX_EXTEND_MINUTES}` } : {}),
      ...(reason.trim() ? {} : { reason: 'A reason is required' }),
    }
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length > 0) return
    try {
      onDone(await run(paramsFor(action, examId, minutes, reason.trim())))
    } catch (caught) {
      if (caught.fields) setErrors(caught.fields)
      else setFailure(errorMessage(caught))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={action.kind === 'end' ? 'danger' : 'primary'} type="submit" form="live-action" loading={loading}>
            {copy.button}
          </Button>
        </>
      }
    >
      <form id="live-action" className={styles.form} onSubmit={submit} noValidate>
        {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
        {needsMinutes && (
          <Input label="Add minutes" type="number" min={1} max={MAX_EXTEND_MINUTES} value={minutesText} onChange={(e) => setMinutesText(e.target.value)} error={errors.minutes} autoFocus />
        )}
        {needsMinutes && (
          <div className={styles.presets} role="group" aria-label="Common reasons">
            {REASON_PRESETS.map((preset) => (
              <button key={preset} type="button" className={styles.preset} aria-pressed={reason === preset} onClick={() => setReason(preset)}>
                {preset}
              </button>
            ))}
          </div>
        )}
        <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} maxLength={200} autoFocus={!needsMinutes} />
      </form>
    </Dialog>
  )
}

/** Mounts a fresh form per action, so its fields always start empty. */
export function ActionDialog({ action, ...rest }) {
  if (!action) return null
  return <ActionForm key={`${action.kind}-${action.attempt?.id ?? 'all'}`} action={action} {...rest} />
}
