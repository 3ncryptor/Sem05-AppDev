// Per-question difficulty: percent correct (as a bar), average marks, average time and the most common wrong answer.
import { Card } from '../../../components/Card.jsx'
import { Table } from '../../../components/Table.jsx'
import { hardestFirst, secondsText, typeLabel } from './analyticsModel.js'
import styles from './Analytics.module.css'

function CorrectBar({ question }) {
  if (question.percentCorrect === null) return '—'
  return (
    <span className={styles.meter}>
      <span className={styles.meterTrack} aria-hidden="true">
        <span className={styles.meterFill} style={{ width: `${question.percentCorrect}%` }} />
      </span>
      <span className={styles.meterValue}>{question.percentCorrect} %</span>
      {question.keySuspect && (
        <span className={styles.warn} title="More top-half students chose a wrong option than the key. Check the key.">
          ⚠ key?
        </span>
      )}
    </span>
  )
}

const COLUMNS = [
  { key: 'no', label: 'Q' },
  { key: 'text', label: 'Question', render: (q) => <span className={styles.questionText}>{q.text}</span> },
  { key: 'type', label: 'Type', render: (q) => typeLabel(q.type) },
  { key: 'correct', label: 'Correct', render: (q) => <CorrectBar question={q} /> },
  { key: 'avgMarks', label: 'Avg marks', align: 'right', render: (q) => (q.avgMarks === null ? '—' : `${q.avgMarks} / ${q.marks}`) },
  { key: 'avgTime', label: 'Avg time', align: 'right', render: (q) => secondsText(q.avgTimeSec) },
  { key: 'commonWrong', label: 'Common wrong', render: (q) => (q.commonWrong ? `${q.commonWrong.label} (${q.commonWrong.count})` : '—') },
]

export function QuestionTable({ questions }) {
  const hasSuspect = questions.some((q) => q.keySuspect)
  return (
    <Card className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Questions</h3>
        <span className={styles.muted}>Hardest first</span>
      </div>
      <Table caption="Question difficulty" columns={COLUMNS} rows={hardestFirst(questions)} rowKey={(q) => q.questionId} />
      {hasSuspect && <p className={styles.muted}>⚠ key? means more top-half students chose a wrong option than the key. Check the key.</p>}
    </Card>
  )
}
