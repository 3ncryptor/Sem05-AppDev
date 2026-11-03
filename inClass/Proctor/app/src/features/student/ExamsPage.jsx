// C1 Exams (student dashboard): resume banner, filter, exams grouped into Open now / Upcoming / Finished.
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Chip } from '../../components/Chip.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { PageHeader } from '../../components/PageHeader.jsx'
import { Segmented } from '../../components/Segmented.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { errorMessage } from '../../lib/api.js'
import { minutesLeft } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { FILTERS, MY_STATUS, SECTIONS, cardAction, cardLines } from './examCardModel.js'
import { linkButton } from './linkButton.js'
import styles from './Student.module.css'

function ExamRow({ exam }) {
  const action = cardAction(exam)
  const meta = [exam.code, ...cardLines(exam).flatMap((line) => line.split(' · '))].filter(Boolean)
  return (
    <article className={styles.row} aria-labelledby={`exam-${exam.id}`}>
      <div className={styles.rowMain}>
        <h3 id={`exam-${exam.id}`} className={styles.rowTitle}>
          {exam.title}
        </h3>
        <p className={styles.rowMeta}>
          {meta.map((line, index) => (
            <span key={`${index}-${line}`} className={index === 0 && exam.code ? styles.code : undefined}>
              {line}
            </span>
          ))}
        </p>
      </div>
      <Chip spec={MY_STATUS[exam.myStatus]} />
      <div className={styles.rowAction}>
        {action && (
          <Link to={action.to} className={linkButton(action.primary ? 'primary' : 'secondary')}>
            {action.label}
          </Link>
        )}
      </div>
    </article>
  )
}

function LoadingRows() {
  return (
    <div className={styles.list} aria-busy="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className={styles.row}>
          <div className={styles.rowMain}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="60%" height={14} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ExamSections({ exams }) {
  return SECTIONS.map((section) => {
    const items = exams.filter(section.match)
    if (items.length === 0) return null
    const headingId = `exams-${section.id}`
    return (
      <section key={section.id} className={styles.section} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.sectionLabel}>
          {section.label}
          <span className={styles.sectionCount}>{items.length}</span>
        </h2>
        <div className={styles.list}>
          {items.map((exam) => (
            <ExamRow key={exam.id} exam={exam} />
          ))}
        </div>
      </section>
    )
  })
}

export function ExamsPage() {
  const { data, error, loading, refetch } = useApi('exams.list')
  const [filter, setFilter] = useState('all')
  const exams = data?.exams ?? []
  const running = exams.find((exam) => exam.myStatus === 'in_progress')
  const visible = exams.filter(FILTERS.find((f) => f.id === filter).match)
  const options = FILTERS.map((f) => {
    const count = exams.filter(f.match).length
    return { value: f.id, label: f.label, count: f.id !== 'all' && count > 0 ? count : undefined }
  })

  return (
    <div className={`${styles.page} page-enter`}>
      {running && (
        <Banner
          tone="focus"
          action={
            <Link to={`/student/attempts/${running.openAttemptId}/resume`} className={linkButton('primary')}>
              Resume
            </Link>
          }
        >
          You have an exam in progress: <strong>{running.title}</strong> · {minutesLeft(running.deadlineAt)} min left
        </Banner>
      )}
      <PageHeader
        title="Exams"
        description="Exams you can take now and soon."
        actions={data && exams.length > 0 && <Segmented label="Filter exams" options={options} value={filter} onChange={setFilter} />}
      />
      {loading && !data && <LoadingRows />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && exams.length === 0 && <EmptyState title="No exams yet.">Your examiner will publish them here.</EmptyState>}
      {data && exams.length > 0 && visible.length === 0 && <EmptyState>Nothing here. Try another filter.</EmptyState>}
      {visible.length > 0 && <ExamSections exams={visible} />}
    </div>
  )
}
