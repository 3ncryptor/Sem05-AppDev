// C2 Exam detail: what the exam is, what Athena captures during it, and Get started (→ C3).
import { ArrowRight, Camera, ChevronLeft, Eye, MonitorUp, RotateCw } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { PageHeader } from '../../components/PageHeader.jsx'
import { errorMessage } from '../../lib/api.js'
import { formatWindow, plural } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { MY_STATUS } from './examCardModel.js'
import styles from './Student.module.css'

/** An icon for each capture summary line, picked by what the line talks about. */
function iconFor(line) {
  if (/webcam|identity/i.test(line)) return Camera
  if (/screenshot/i.test(line)) return MonitorUp
  return Eye
}

function Fact({ label, value }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** A hairline-separated section of the reading column: small label on the left, content on the right. */
function DetailSection({ id, title, children }) {
  return (
    <section className={styles.detailSection} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionLabel}>
        {title}
      </h2>
      <div className={styles.detailBody}>{children}</div>
    </section>
  )
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
      <div className={`${styles.page} ${styles.reading}`}>
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      </div>
    )
  }
  if (!exam) {
    return (
      <div className={`${styles.page} ${styles.reading}`} aria-busy="true">
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
    <div className={`${styles.page} ${styles.reading} page-enter`}>
      <PageHeader
        breadcrumb={
          <Link to="/student/exams" className={styles.back}>
            <ChevronLeft size={14} aria-hidden="true" /> Exams
          </Link>
        }
        title={exam.title}
        meta={<Chip spec={MY_STATUS[exam.myStatus]} />}
        description={exam.description}
      />
      <dl className={styles.facts}>
        {exam.code && <Fact label="Code" value={<span className="mono">{exam.code}</span>} />}
        <Fact label="Duration" value={`${exam.durationMinutes} min`} />
        <Fact label="Questions" value={exam.questionCount} />
        <Fact label="Marks" value={exam.totalMarks} />
        <Fact label="Pass mark" value={`${exam.resultPolicy?.passPercent ?? '—'}%`} />
      </dl>
      <DetailSection id="window-title" title="When">
        <p>{formatWindow(exam.opensAt, exam.closesAt)}</p>
        <p className={styles.soft}>{plural(exam.attemptsLeft, 'attempt')} left</p>
      </DetailSection>
      <DetailSection id="results-title" title="Results">
        <p>{visibility}</p>
      </DetailSection>
      <DetailSection id="proctoring-title" title="What Athena captures">
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
      </DetailSection>
      <DetailSection id="before-title" title="Before you start">
        <p className={styles.soft}>
          You'll check your setup (about 2 minutes), read the rules and take an identity photo. The clock starts only when
          you press Begin.
        </p>
      </DetailSection>
      <div className={styles.actions}>
        {!exam.canStart && exam.cannotStartReason && <p className={styles.blocked}>{START_BLOCKED[exam.cannotStartReason]}</p>}
        <Button variant="primary" size="lg" onClick={onStart} disabled={!exam.canStart}>
          {resuming ? 'Resume' : 'Get started'} <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
