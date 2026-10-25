// Score distribution as CSS bars (no chart library), with pass / median / mean markers and a table view.
import { useState } from 'react'
import { Button } from '../../../components/Button.jsx'
import { Card } from '../../../components/Card.jsx'
import { Table } from '../../../components/Table.jsx'
import styles from './Analytics.module.css'

const TABLE_COLUMNS = [
  { key: 'range', label: 'Score range', render: (b) => `${b.from}–${b.to} %` },
  { key: 'count', label: 'Students', align: 'right' },
]

function Marker({ percent, label, tone }) {
  if (percent === null || percent === undefined) return null
  return (
    <span className={`${styles.marker} ${styles[tone]}`} style={{ left: `${percent}%` }}>
      <span className={styles.markerLabel}>{label}</span>
    </span>
  )
}

function Bars({ bins, markers }) {
  const highest = Math.max(1, ...bins.map((b) => b.count))
  return (
    <div className={styles.chart} role="img" aria-label={bins.map((b) => `${b.from}–${b.to} %: ${b.count}`).join(', ')}>
      <div className={styles.bars}>
        {bins.map((b) => (
          <div key={b.from} className={styles.barSlot}>
            <span className={styles.barCount}>{b.count > 0 ? b.count : ''}</span>
            <span className={styles.bar} style={{ height: `${(b.count / highest) * 100}%` }} />
          </div>
        ))}
        <Marker percent={markers.passPercent} label={`pass ${markers.passPercent} %`} tone="pass" />
        <Marker percent={markers.median} label="median" tone="median" />
        <Marker percent={markers.mean} label="mean" tone="mean" />
      </div>
      <div className={styles.axis} aria-hidden="true">
        {bins.map((b) => (
          <span key={b.from}>{b.from}</span>
        ))}
        <span className={styles.axisEnd}>100 %</span>
      </div>
    </div>
  )
}

export function ScoreHistogram({ bins, markers, reading }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Score distribution</h3>
        <Button variant="ghost" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show as chart' : 'Show as table'}
        </Button>
      </div>
      {asTable ? (
        <Table caption="Score distribution" columns={TABLE_COLUMNS} rows={bins} rowKey={(b) => String(b.from)} />
      ) : (
        <Bars bins={bins} markers={markers} />
      )}
      <p className={styles.muted}>{reading}</p>
    </Card>
  )
}
