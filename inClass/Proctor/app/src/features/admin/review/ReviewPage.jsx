// A10 Review: the exam's attempts on the left; the selected attempt's answers and saved images on the right.
// The selection lives in ?attempt=<id> so Back/Forward and deep links work.
import { RotateCw, Users } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { errorMessage } from '../../../lib/api.js'
import { useApi } from '../../../lib/useApi.js'
import { AttemptList } from './AttemptList.jsx'
import { AttemptPanel } from './AttemptPanel.jsx'
import styles from './Review.module.css'

function ListSkeleton() {
  return (
    <div className={styles.listLoading} aria-busy="true">
      {[0, 1, 2, 3, 4].map((key) => (
        <Skeleton key={key} height={52} radius={10} />
      ))}
    </div>
  )
}

export function ReviewPage() {
  const { examId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, error, loading, refetch } = useApi('admin.results.list', { examId })
  const rows = data?.rows ?? []
  const requested = searchParams.get('attempt')
  const selectedId = rows.some((r) => r.attemptId === requested) ? requested : rows[0]?.attemptId ?? null
  const select = (attemptId) => setSearchParams({ attempt: attemptId })

  if (error) {
    return (
      <div className={styles.page}>
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      </div>
    )
  }
  if (data && rows.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState icon={Users} title="No attempts yet">
          Attempts and their saved images appear here once students start the exam.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className={`${styles.page} ${styles.console}`}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>Attempts {data ? `· ${rows.length}` : ''}</p>
        {loading && !data ? <ListSkeleton /> : <AttemptList rows={rows} selectedId={selectedId} onSelect={select} />}
      </aside>
      <section className={styles.main} aria-label="Selected attempt">
        {selectedId && <AttemptPanel key={selectedId} attemptId={selectedId} />}
      </section>
    </div>
  )
}
