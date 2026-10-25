// A4 Questions (the builder) · #/admin/exams/:examId/questions. Outline + editor + preview.
// Published exams are read-only; the server refuses edits with EXAM_LOCKED.
import { ListPlus, RotateCw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { useApi, useMutation } from '../../../lib/useApi.js'
import { DeleteDialog } from './DeleteDialog.jsx'
import { questionsWithProblems } from './initialQuestions.js'
import { moved } from './items.js'
import { Outline } from './Outline.jsx'
import { Preview } from './Preview.jsx'
import { QuestionEditor } from './QuestionEditor.jsx'
import { TypePicker } from './TypePicker.jsx'
import { previewQuestion, starterDefinition, toDraft } from './typeModels.js'
import styles from './Builder.module.css'

const LOCKED_TEXT = 'Published · questions are locked. Unpublish (no one has started) or duplicate the exam to make changes.'

function BuilderSkeleton() {
  return (
    <div className={styles.builder} aria-busy="true">
      <div className={styles.outline}>
        {[1, 2, 3, 4].map((n) => <Skeleton key={n} height={32} />)}
      </div>
      <div className={styles.editor}>
        <Skeleton width={200} height={22} />
        <Skeleton height={120} />
        <Skeleton height={80} />
      </div>
    </div>
  )
}

function useQuestionActions(examId, setQuestions, setSelectedId) {
  const toast = useToast()
  const create = useMutation('admin.questions.create')
  const remove = useMutation('admin.questions.delete')
  const reorder = useMutation('admin.questions.reorder')

  const add = async (type) => {
    try {
      const { question } = await create.run({ examId, type, text: '', marks: 1, ...starterDefinition(type) })
      setQuestions((list) => [...list, question])
      setSelectedId(question.id)
      return true
    } catch (error) {
      toast(errorMessage(error), { tone: 'critical' })
      return false
    }
  }

  const destroy = async (questions, id) => {
    try {
      await remove.run({ examId, questionId: id })
      const index = questions.findIndex((q) => q.id === id)
      const rest = questions.filter((q) => q.id !== id)
      setQuestions(rest)
      setSelectedId(rest[Math.min(index, rest.length - 1)]?.id ?? null)
      toast('Question deleted', { tone: 'ok' })
      return true
    } catch (error) {
      toast(errorMessage(error), { tone: 'critical' })
      return false
    }
  }

  const move = async (questions, from, to) => {
    const next = moved(questions, from, to)
    if (next === questions) return
    setQuestions(next)
    try {
      await reorder.run({ examId, order: next.map((q) => q.id) })
    } catch (error) {
      setQuestions(questions)
      toast(errorMessage(error), { tone: 'critical' })
    }
  }

  return { add, destroy, move, creating: create.loading, deleting: remove.loading }
}

function Builder({ exam }) {
  const [questions, setQuestions] = useState(() => questionsWithProblems(exam))
  const [selectedId, setSelectedId] = useState(questions[0]?.id ?? null)
  const [draftState, setDraftState] = useState({ key: null, draft: null })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const actions = useQuestionActions(exam.id, setQuestions, setSelectedId)
  const readOnly = Boolean(exam.locked?.questions ?? exam.status === 'published')

  const index = questions.findIndex((q) => q.id === selectedId)
  const selected = questions[index] ?? null
  const editorKey = selected ? `${selected.id}:${selected.type}` : null
  const draft = selected && draftState.key === editorKey ? draftState.draft : selected && toDraft(selected)

  const onSaved = useCallback((saved) => setQuestions((list) => list.map((q) => (q.id === saved.id ? saved : q))), [])
  const onDraft = (next) => setDraftState({ key: editorKey, draft: next })
  const pick = async (type) => {
    if (await actions.add(type)) setPickerOpen(false)
  }
  const confirmDelete = async () => {
    if (await actions.destroy(questions, questions[deleteIndex].id)) setDeleteIndex(null)
  }

  return (
    <div className={styles.page}>
      {readOnly && <Banner tone="focus">{LOCKED_TEXT}</Banner>}
      {questions.length === 0 ? (
        <EmptyState icon={ListPlus} title="No questions yet."
          action={!readOnly && <Button variant="primary" onClick={() => setPickerOpen(true)}>Add question</Button>}>
          Add the first one to start building this exam.
        </EmptyState>
      ) : (
        <div className={styles.builder}>
          <Outline questions={questions} selectedId={selectedId} readOnly={readOnly} onSelect={setSelectedId}
            onMove={(from, to) => actions.move(questions, from, to)} onAdd={() => setPickerOpen(true)} />
          {selected && (
            <>
              <QuestionEditor key={editorKey} examId={exam.id} question={selected} index={index} draft={draft}
                onDraft={onDraft} readOnly={readOnly} onSaved={onSaved} onDelete={() => setDeleteIndex(index)} />
              <Preview key={`preview:${editorKey}`} examId={exam.id} question={previewQuestion(selected.id, draft)}
                index={index} total={questions.length} />
            </>
          )}
        </div>
      )}
      <TypePicker open={pickerOpen} busy={actions.creating} onPick={pick} onClose={() => setPickerOpen(false)} />
      <DeleteDialog index={deleteIndex} busy={actions.deleting} onConfirm={confirmDelete} onClose={() => setDeleteIndex(null)} />
    </div>
  )
}

export function QuestionsPage() {
  const { examId } = useParams()
  const { data, error, loading, refetch } = useApi('admin.exams.get', { examId })
  const exam = data?.exam ?? null

  if (error) {
    return (
      <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
        {errorMessage(error)}
      </Banner>
    )
  }
  if (loading || !exam) return <BuilderSkeleton />
  return <Builder key={exam.id} exam={exam} />
}
