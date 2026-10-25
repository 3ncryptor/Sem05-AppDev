// C17 My analytics: the student's own trend, accuracy by topic and type, and pace, from visible results only.
import { ChartColumn, Table2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { Card } from '../../components/Card.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { StatTile } from '../../components/StatTile.jsx'
import { plural } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { BarList, DataTable, TrendChart } from './Charts.jsx'
import { LoadError, LoadingRows } from './PageStates.jsx'
import { TYPE_LABELS, formatPercent } from './reviewModel.js'
import styles from './Results.module.css'

const formatSeconds = (n) => (typeof n === 'number' ? `${n} s` : '—')

function trendRows(trend) {
  return trend.map((t) => ({ key: t.attemptId, label: t.examTitle, value: t.percent ?? 0, display: formatPercent(t.percent) }))
}

function accuracyRows(list, keyName, labelOf = (k) => k) {
  return list
    .toSorted((a, b) => b.accuracy - a.accuracy)
    .map((item) => ({ key: item[keyName], label: labelOf(item[keyName]), value: item.accuracy, display: formatPercent(item.accuracy) }))
}

function timeRows({ me, classMedian }) {
  return [
    { key: 'me', label: 'You', value: me, display: formatSeconds(me) },
    { key: 'class', label: 'Class median', value: classMedian, display: formatSeconds(classMedian) },
  ]
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <h2 className={styles.chartTitle}>{title}</h2>
      {children}
    </Card>
  )
}

function BarCard({ title, rows, headers, asTable, max }) {
  return (
    <ChartCard title={title}>
      {rows.length === 0 && <p className={styles.muted}>No data yet.</p>}
      {rows.length > 0 && (asTable ? <DataTable caption={title} headers={headers} rows={rows} /> : <BarList label={title} rows={rows} max={max} />)}
    </ChartCard>
  )
}

function Tiles({ tiles, timePerQuestion }) {
  return (
    <div className={styles.tiles}>
      <StatTile label="Exams" value={tiles.examsTaken} />
      <StatTile label="Average" value={formatPercent(tiles.averagePercent)} />
      <StatTile label="Best" value={formatPercent(tiles.bestPercent)} />
      <StatTile label="Time / question" value={formatSeconds(timePerQuestion.me)} />
    </div>
  )
}

function Charts({ data, asTable }) {
  const trend = trendRows(data.trend ?? [])
  const time = timeRows(data.timePerQuestion ?? {})
  const maxTime = Math.max(1, ...time.map((t) => t.value ?? 0))
  return (
    <div className={styles.charts}>
      <ChartCard title="Score over time">
        {asTable ? <DataTable caption="Score over time" headers={['Exam', 'Score']} rows={trend} /> : <TrendChart label="Score over time" points={trend} />}
      </ChartCard>
      <BarCard title="Accuracy by topic" rows={accuracyRows(data.byTopic ?? [], 'topic')} headers={['Topic', 'Accuracy']} asTable={asTable} />
      <BarCard
        title="By question type"
        rows={accuracyRows(data.byType ?? [], 'type', (t) => TYPE_LABELS[t] ?? t)}
        headers={['Type', 'Accuracy']}
        asTable={asTable}
      />
      <BarCard title="Time per question" rows={time} headers={['Who', 'Average']} asTable={asTable} max={maxTime} />
    </div>
  )
}

export function MyAnalyticsPage() {
  const { data, error, refetch } = useApi('me.analytics')
  const [asTable, setAsTable] = useState(false)

  if (error) return <LoadError error={error} onRetry={refetch} />
  if (!data) return <LoadingRows rows={3} />

  const count = data.tiles?.examsTaken ?? 0
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My analytics</h1>
        {count > 0 && <p className={styles.subtitle}>From {plural(count, 'exam')} with results</p>}
      </header>
      {count === 0 ? (
        <EmptyState icon={ChartColumn} title="Your analytics appear after your first result." action={<Link to="/student/results">See results</Link>} />
      ) : (
        <>
          <Tiles tiles={data.tiles} timePerQuestion={data.timePerQuestion ?? {}} />
          <Charts data={data} asTable={asTable} />
          <div className={styles.toolbar}>
            <Button variant="ghost" icon={asTable ? ChartColumn : Table2} onClick={() => setAsTable((v) => !v)}>
              {asTable ? 'Show as charts' : 'Show as tables'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
