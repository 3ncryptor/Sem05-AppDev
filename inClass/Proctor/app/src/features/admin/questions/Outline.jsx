// A4 outline: the exam's questions in order, with ↑/↓ to reorder and ⚠ for publish problems.
import { ArrowDown, ArrowUp, Plus, TriangleAlert } from 'lucide-react'
import { Button } from '../../../components/Button.jsx'
import { stemOf, TYPE_META } from './typeMeta.js'
import styles from './Builder.module.css'

function OutlineRow({ question, index, total, selected, readOnly, onSelect, onMove }) {
  const hasProblems = question.problems?.length > 0
  return (
    <li className={`${styles.outlineRow} ${selected ? styles.selected : ''}`}>
      <button type="button" className={styles.outlineMain} onClick={onSelect} aria-current={selected ? 'true' : undefined}>
        <span className={styles.outlineNo}>{index + 1}</span>
        <span className={styles.outlineSymbol} aria-label={TYPE_META[question.type]?.label}>{TYPE_META[question.type]?.symbol}</span>
        <span className={styles.outlineStem}>{stemOf(question.text)}</span>
        {hasProblems && <TriangleAlert size={14} className={styles.warn} aria-label={question.problems.join(', ')} />}
        <span className={styles.outlineMarks}>{question.marks}</span>
      </button>
      {!readOnly && (
        <span className={styles.outlineMove}>
          <Button variant="ghost" icon={ArrowUp} aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)} />
          <Button variant="ghost" icon={ArrowDown} aria-label={`Move question ${index + 1} down`} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} />
        </span>
      )}
    </li>
  )
}

export function Outline({ questions, selectedId, readOnly, onSelect, onMove, onAdd }) {
  const marks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
  return (
    <nav className={styles.outline} aria-label="Questions">
      <p className={styles.panelLabel}>
        Outline <span className={styles.outlineCount}>{questions.length} q · {marks} mk</span>
      </p>
      <ol className={styles.outlineList}>
        {questions.map((question, index) => (
          <OutlineRow key={question.id} question={question} index={index} total={questions.length} readOnly={readOnly}
            selected={question.id === selectedId} onSelect={() => onSelect(question.id)} onMove={onMove} />
        ))}
      </ol>
      {!readOnly && <Button variant="ghost" icon={Plus} onClick={onAdd}>Add question</Button>}
    </nav>
  )
}
