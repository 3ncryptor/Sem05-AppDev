// A12 Analytics: summary tiles, score distribution, per-question difficulty and accuracy by topic.
import { BarChart3, RotateCw } from 'lucide-react'
import { useParams } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { StatTile } from '../../../components/StatTile.jsx'
import { errorMessage } from '../../../lib/api.js'
import { useApi } from '../../../lib/useApi.js'
import { highLow, percentOrDash, timeUsedText } from './analyticsModel.js'
import { QuestionTable } from './QuestionTable.jsx'
import { ScoreHistogram } from './ScoreHistogram.jsx'
import styles from './Analytics.module.css'

function Tiles({ tiles, high, low }) {
  return (
    <div className={styles.tiles}>
      <StatTile label="Submitted" value={`${tiles.submitted} / ${tiles.started}`} detail={`${percentOrDash(tiles.completionPercent)} completed`} />
      <StatTile label="Average" value={percentOrDash(tiles.meanPercent)} />
      <StatTile label="Median" value={percentOrDash(tiles.medianPercent)} />
      <StatTile label="Highest" value={percentOrDash(high)} />
      <StatTile label="Lowest" value={percentOrDash(low)} />
      <StatTile label="Time used" value={timeUsedText(tiles.avgTimeUsedSec, tiles.durationMinutes)} detail="on average" />
    </div>
  )
}

function Topics({ topics }) {
  const tagged = topics.filter((t) => t.topic !== 'Untagged')
  if (tagged.length === 0) return null
  return (
    <Card className={styles.section}>
      <h3 className={styles.sectionTitle}>Accuracy by topic</h3>
      <ul className={styles.topicList}>
        {topics.map((t) => (
          <li key={t.topic} className={styles.topicRow}>
            <span>{t.topic}</span>
            <span className={styles.meterTrack} aria-hidden="true">
              <span className={styles.meterFill} style={{ width: `${t.accuracy}%` }} />
            </span>
            <span className={styles.meterValue}>{t.accuracy} %</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LoadingView() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.tiles}>
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <Skeleton key={key} height={84} radius={14} />
        ))}
      </div>
      <Skeleton height={260} radius={14} />
    </div>
  )
}

export function AnalyticsPage() {
  const { examId } = useParams()
  const { data, error, loading, refetch } = useApi('admin.analytics', { examId })
  const results = useApi('admin.results.list', { examId })
  const { high, low } = highLow(results.data?.rows ?? [])

  if (loading && !data) return <LoadingView />
  if (error) {
    return (
      <div className={styles.page}>
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Analytics</h2>
        <span className={styles.muted}>Submitted attempts · n = {data.n}</span>
      </header>
      <Tiles tiles={data.tiles} high={high} low={low} />
      {data.n === 0 ? (
        <EmptyState icon={BarChart3} title="No submitted attempts yet">
          Charts appear once students submit.
        </EmptyState>
      ) : (
        <>
          <ScoreHistogram bins={data.histogram} markers={data.markers} reading={data.reading} />
          <QuestionTable questions={data.questions} />
          <Topics topics={data.topics} />
        </>
      )}
    </div>
  )
}
