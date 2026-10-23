// C2 Exam detail: what the exam is, how it's proctored, and Get started (→ C3).
import { ArrowRight, Camera, ChevronLeft, Flag, Maximize, MonitorUp, RotateCw, ScanFace } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { StatTile } from '../../components/StatTile.jsx'
import { errorMessage } from '../../lib/api.js'
import { formatWindow, plural } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { MY_STATUS } from './examCardModel.js'
import styles from './Student.module.css'

/** An icon for each proctoring summary line, picked by what the line talks about. */
function iconFor(line) {
  if (/camera/i.test(line)) return Camera
  if (/fullscreen|display/i.test(line)) return Maximize
  if (/screen/i.test(line)) return MonitorUp
  if (/face/i.test(line)) return ScanFace
  return Flag
}

const START_BLOCKED = {
  EXAM_NOT_OPEN: "This exam isn't open yet.",
  NO_ATTEMPTS_LEFT: "You've used all your attempts.",
}

export function ExamDetailPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const { data, error, refetch } = useApi('exams.get', { examId })
  const exam = data?.exam

  if (error) {
    return (
      <div className={styles.page}>
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      </div>
    )
  }
  if (!exam) {
    return (
      <div className={styles.page} aria-busy="true">
        <Skeleton width={260} height={28} />
        <Skeleton width="70%" />
      </div>
    )
  }

  const resuming = exam.myStatus === 'in_progress'
  const visibility = exam.resultPolicy?.visibility === 'after_submit' ? 'Shown right after you submit' : 'Shown after your examiner publishes them'
  const onStart = () =>
    navigate(resuming ? `/student/attempts/${exam.openAttemptId}/resume` : `/student/exams/${examId}/start/check`)

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <Link to="/student/exams" className={styles.back}>
        <ChevronLeft size={16} aria-hidden="true" /> Exams
      </Link>
      <header className={styles.detailHeader}>
        <div>
          <h1 className={styles.title}>{exam.title}</h1>
          {exam.description && <p className={styles.subtitle}>{exam.description}</p>}
        </div>
        <Chip spec={MY_STATUS[exam.myStatus]} />
      </header>
      <div className={styles.tiles}>
        <StatTile label="Duration" value={`${exam.durationMinutes} min`} />
        <StatTile label="Questions" value={exam.questionCount} />
        <StatTile label="Marks" value={exam.totalMarks} />
        <StatTile label="Pass mark" value={`${exam.resultPolicy?.passPercent ?? '—'}%`} />
      </div>
      <dl className={styles.facts}>
        <dt>Window</dt>
        <dd>
          {formatWindow(exam.opensAt, exam.closesAt)} · {plural(exam.attemptsLeft, 'attempt')} left
        </dd>
        <dt>Results</dt>
        <dd>{visibility}</dd>
      </dl>
      <section aria-labelledby="proctoring-title" className={styles.proctoring}>
        <h2 id="proctoring-title" className={styles.sectionTitle}>
          Proctoring
        </h2>
        <ul className={styles.ruleList}>
          {(exam.proctoringSummary?.lines ?? []).map((line) => {
            const Icon = iconFor(line)
            return (
              <li key={line}>
                <Icon size={16} aria-hidden="true" /> {line}
              </li>
            )
          })}
        </ul>
      </section>
      <p className={styles.note}>
        Before you start you'll check your setup (about 2 minutes), read the rules and take an identity photo. The clock
        starts only when you press Begin.
      </p>
      <div className={styles.actions}>
        {!exam.canStart && exam.cannotStartReason && <p className={styles.blocked}>{START_BLOCKED[exam.cannotStartReason]}</p>}
        <Button variant="primary" size="lg" onClick={onStart} disabled={!exam.canStart}>
          {resuming ? 'Resume' : 'Get started'} <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
