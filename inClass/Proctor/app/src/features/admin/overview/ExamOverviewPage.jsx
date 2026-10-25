// A3 Exam overview: attempt counts and a setup checklist that links to the tab that fixes each line.
import { RotateCw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { StatTile } from '../../../components/StatTile.jsx'
import { errorMessage } from '../../../lib/api.js'
import { formatWindow, plural } from '../../../lib/format.js'
import { useWorkspaceExam } from './useWorkspaceExam.js'
import styles from './Overview.module.css'

const hasProblem = (exam, target) => exam.problems.some((p) => p.target === target)

function screenshotText({ minSec, maxSec }) {
  return minSec === maxSec ? `every ${minSec} s` : `every ${minSec}–${maxSec} s`
}

function setupRows(exam) {
  const policy = exam.resultPolicy
  return [
    {
      ok: !hasProblem(exam, 'questions'),
      text: `${plural(exam.questions.length, 'question')} · ${plural(exam.totalMarks, 'mark')}`,
      tab: 'questions',
      label: 'Questions',
    },
    {
      ok: !hasProblem(exam, 'settings'),
      text: `${exam.durationMinutes} min · ${formatWindow(exam.opensAt, exam.closesAt)} · ${plural(exam.maxAttempts, 'attempt')}`,
      tab: 'settings',
      label: 'Settings',
    },
    {
      ok: true,
      text: `Screen and camera screenshots ${screenshotText(exam.proctoring.screenshots)}`,
      tab: 'settings',
      label: 'Settings',
    },
    {
      ok: true,
      text: `Results: ${policy.visibility === 'after_submit' ? 'right after submitting' : 'when you publish'} · pass ${policy.passPercent} %`,
      tab: 'settings',
      label: 'Settings',
    },
  ]
}

function Tiles({ counts }) {
  return (
    <div className={styles.tiles}>
      <StatTile label="Started" value={counts.started} />
      <StatTile label="Submitted" value={counts.submitted} />
      <StatTile label="In progress" value={counts.inProgress} />
      <StatTile label="Mean" value={counts.meanPercent === null ? '—' : `${counts.meanPercent} %`} />
    </div>
  )
}

function Setup({ exam }) {
  const navigate = useNavigate()
  return (
    <Card>
      <h2 className={styles.section}>Setup</h2>
      <ul className={styles.list}>
        {setupRows(exam).map((row) => (
          <li key={row.text} className={styles.row}>
            <span className={row.ok ? styles.ok : styles.problem} aria-label={row.ok ? 'Ready' : 'Needs fixing'}>
              {row.ok ? '✓' : '✕'}
            </span>
            <span className={styles.rowText}>{row.text}</span>
            <Button variant="ghost" onClick={() => navigate(`/admin/exams/${exam.id}/${row.tab}`)}>
              {row.label}
            </Button>
          </li>
        ))}
      </ul>
      {exam.problems.length > 0 && (
        <p className={styles.note}>{plural(exam.problems.length, 'problem')} to fix before publishing.</p>
      )}
    </Card>
  )
}

export function ExamOverviewPage() {
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
        <Skeleton height={84} radius={14} />
        <Skeleton height={180} radius={14} />
      </div>
    )
  }
  return (
    <div className={styles.page}>
      <h2 className="visually-hidden">Overview</h2>
      <Tiles counts={exam.counts} />
      {exam.counts.started === 0 && <p className={styles.note}>No one has started this exam yet.</p>}
      <Setup exam={exam} />
    </div>
  )
}
