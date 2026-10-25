// A4 editor: shared fields (type, marks, text, topic, explanation) + the type's key editor.
// Autosaves through admin.questions.update; server field errors sit under their fields.
import { Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Input } from '../../../components/Input.jsx'
import { Select } from '../../../components/Select.jsx'
import { Textarea } from '../../../components/Textarea.jsx'
import { useMutation } from '../../../lib/useApi.js'
import { TYPE_EDITORS } from './editors/index.js'
import { SaveStatus } from './SaveStatus.jsx'
import { TypeChangeDialog } from './TypeChangeDialog.jsx'
import { TYPE_META, TYPE_ORDER } from './typeMeta.js'
import { starterDefinition, toPayload } from './typeModels.js'
import { useAutosave } from './useAutosave.js'
import styles from './Builder.module.css'

const TYPE_OPTIONS = TYPE_ORDER.map((type) => ({ value: type, label: `${TYPE_META[type].symbol}  ${TYPE_META[type].label}` }))

/**
 * @param {{ examId: string, question: object, index: number, draft: object, onDraft: (draft: object) => void,
 *           readOnly: boolean, onSaved: (question: object) => void, onDelete: () => void }} props
 */
export function QuestionEditor({ examId, question, index, draft, onDraft, readOnly, onSaved, onDelete }) {
  const { run: update } = useMutation('admin.questions.update')
  const save = useCallback(
    async (payload) => onSaved((await update({ examId, questionId: question.id, ...payload })).question),
    [examId, question.id, update, onSaved],
  )
  const autosave = useAutosave(save)
  const [nextType, setNextType] = useState(null)
  const [changingType, setChangingType] = useState(false)
  const errors = autosave.fields
  const TypeEditor = TYPE_EDITORS[draft.type]

  const change = (patch) => {
    const next = { ...draft, ...patch }
    onDraft(next)
    autosave.schedule(toPayload(next))
  }
  const confirmType = async () => {
    setChangingType(true)
    await autosave.saveNow({ type: nextType, ...starterDefinition(nextType) })
    setChangingType(false)
    setNextType(null)
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <h2 className={styles.editorTitle}>Q{index + 1} · {TYPE_META[draft.type]?.label}</h2>
        {!readOnly && <Button variant="ghost" icon={Trash2} onClick={onDelete}>Delete</Button>}
      </div>
      {question.problems?.length > 0 && (
        <Banner tone="attention">Before publishing: {question.problems.join(', ')}.</Banner>
      )}
      {autosave.status === 'error' && (
        <Banner tone="critical" role="alert">{autosave.message}</Banner>
      )}
      <fieldset className={styles.editorFields} disabled={readOnly}>
        <div className={styles.inlineRow}>
          <Select label="Type" options={TYPE_OPTIONS} value={draft.type} error={errors.type}
            onChange={(event) => setNextType(event.target.value === draft.type ? null : event.target.value)} />
          <div className={styles.narrow}>
            <Input label="Marks" type="number" min={0.5} max={100} step={0.5} value={draft.marks} error={errors.marks}
              onChange={(event) => change({ marks: event.target.value })} />
          </div>
        </div>
        <Textarea label="Question" hint="Use ``` fences for code." rows={5} maxLength={5000} value={draft.text}
          error={errors.text} onChange={(event) => change({ text: event.target.value })} />
        {TypeEditor ? (
          <TypeEditor draft={draft} errors={errors} onChange={change} />
        ) : (
          <Banner tone="critical">This question type ({draft.type}) has no editor.</Banner>
        )}
        <Input label="Topic" maxLength={60} value={draft.topic} error={errors.topic}
          onChange={(event) => change({ topic: event.target.value })} />
        <Textarea label="Explanation" hint="Shown with results, never during the exam." rows={3} maxLength={3000}
          value={draft.explanation} error={errors.explanation} onChange={(event) => change({ explanation: event.target.value })} />
      </fieldset>
      <SaveStatus status={autosave.status} />
      <TypeChangeDialog nextType={nextType} busy={changingType} onConfirm={confirmType} onClose={() => setNextType(null)} />
    </div>
  )
}
