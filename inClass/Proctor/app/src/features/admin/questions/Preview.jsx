// A4 preview: the question as a student sees it. "Check answer" scores the saved version with
// admin.questions.previewScore, so the admin can test the key.
import { useState } from 'react'
import { Button } from '../../../components/Button.jsx'
import { errorMessage } from '../../../lib/api.js'
import { useMutation } from '../../../lib/useApi.js'
import { QuestionView } from '../../../question/QuestionView.jsx'
import styles from './Builder.module.css'

export function Preview({ examId, question, index, total }) {
  const [response, setResponse] = useState(null)
  const [result, setResult] = useState(null)
  const { run, loading } = useMutation('admin.questions.previewScore')

  const answer = (next) => {
    setResponse(next)
    setResult(null)
  }
  const check = async () => {
    try {
      const data = await run({ examId, questionId: question.id, response })
      setResult({ text: `→ ${data.marksAwarded} / ${data.marks} marks ${data.marksAwarded === data.marks ? '✓' : ''}`, isError: false })
    } catch (error) {
      setResult({ text: errorMessage(error), isError: true })
    }
  }

  return (
    <aside className={styles.preview} aria-label="Preview">
      <p className={styles.panelLabel}>Preview</p>
      <div className={styles.previewCard}>
        <p className={styles.previewMeta}>
          Q{index + 1} of {total} · {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </p>
        <QuestionView question={question} response={response} onChange={answer} mode="preview" />
      </div>
      <p className={styles.hint}>Answer as a student to check the key (uses the last saved version).</p>
      <div className={styles.inlineRow}>
        <Button onClick={check} loading={loading} disabled={response === null}>Check answer</Button>
        {result && <span className={result.isError ? styles.fieldError : styles.score} role="status">{result.text}</span>}
      </div>
    </aside>
  )
}
