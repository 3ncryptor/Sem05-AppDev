// A5 Exam settings: explicit save (no autosave), field errors from the server, and a prompt before
// leaving with unsaved changes. Screenshot timing is the one proctoring setting left; it saves through
// admin.exams.updateProctoring alongside the settings.
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useBlocker } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { useToast } from '../../../components/toastContext.js'
import { ApiError, errorMessage } from '../../../lib/api.js'
import { useMutation } from '../../../lib/useApi.js'
import { useWorkspaceExam } from '../overview/useWorkspaceExam.js'
import { DangerZone } from './DangerZone.jsx'
import { AttemptsSection, ResultsSection, ScreenshotsSection, TextsSection, TimingSection } from './SettingsSections.jsx'
import { formFromExam, isDirty, screenshotsChanged, screenshotsPayload, settingsPayload, stripProctoringPrefix, validate } from './settingsForm.js'
import styles from './Settings.module.css'

function LeaveDialog({ blocker }) {
  if (blocker.state !== 'blocked') return null
  return (
    <Dialog
      open
      onClose={() => blocker.reset()}
      title="Leave without saving?"
      description="Your changes to these settings will be lost."
      footer={
        <>
          <Button onClick={() => blocker.reset()}>Stay</Button>
          <Button variant="danger" onClick={() => blocker.proceed()}>
            Discard and leave
          </Button>
        </>
      }
    />
  )
}

function useSaveSettings(examId) {
  const settings = useMutation('admin.exams.updateSettings')
  const proctoring = useMutation('admin.exams.updateProctoring')
  const save = async (form, initial) => {
    await settings.run({ examId, settings: settingsPayload(form) })
    if (!screenshotsChanged(form, initial)) return
    try {
      await proctoring.run({ examId, proctoring: screenshotsPayload(form) })
    } catch (error) {
      throw new ApiError({ code: error?.code, message: error?.message, fields: error?.fields ? stripProctoringPrefix(error.fields) : undefined })
    }
  }
  return { save, saving: settings.loading || proctoring.loading }
}

function SettingsForm({ exam, onSaved }) {
  const toast = useToast()
  const initial = formFromExam(exam)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const { save, saving } = useSaveSettings(exam.id)
  const dirty = isDirty(form, initial)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const discard = () => {
    setForm(initial)
    setErrors({})
    setFailure(null)
  }
  const submit = async () => {
    const clientErrors = validate(form)
    setErrors(clientErrors)
    setFailure(null)
    if (Object.keys(clientErrors).length) return
    try {
      await save(form, initial)
      toast('Settings saved', { tone: 'ok' })
      onSaved()
    } catch (error) {
      setErrors(error?.fields ?? {})
      setFailure(error?.fields ? 'Some fields need attention.' : errorMessage(error))
    }
  }

  const sectionProps = { form, set, errors, locked: exam.locked }
  return (
    <div className={styles.page}>
      <h2 className="visually-hidden">Settings</h2>
      {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
      <TimingSection {...sectionProps} />
      <AttemptsSection {...sectionProps} />
      <TextsSection {...sectionProps} />
      <ResultsSection {...sectionProps} />
      <ScreenshotsSection {...sectionProps} locked={exam.locked.proctoring} />
      <DangerZone exam={exam} onChanged={onSaved} />
      {dirty && (
        <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <div className={styles.saveActions}>
            <Button onClick={discard} disabled={saving}>Discard</Button>
            <Button variant="primary" onClick={submit} loading={saving}>
              Save settings
            </Button>
          </div>
        </div>
      )}
      <LeaveDialog blocker={blocker} />
    </div>
  )
}

export function ExamSettingsPage() {
  const { exam, error, refetch } = useWorkspaceExam()
  if (error) {
    return (
      <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
        {errorMessage(error)}
      </Banner>
    )
  }
  if (!exam) {
    return (
      <div className={styles.page} aria-busy="true">
        <Skeleton height={160} radius={14} />
        <Skeleton height={160} radius={14} />
      </div>
    )
  }
  // A new updatedAt after saving remounts the form from the saved exam.
  return <SettingsForm key={exam.updatedAt} exam={exam} onSaved={refetch} />
}
