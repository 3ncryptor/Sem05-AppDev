// Small dependency-free charts for C17: CSS bars and an inline SVG line. Each has a table form.
import styles from './Results.module.css'

const TREND = Object.freeze({ width: 520, height: 200, left: 36, right: 16, top: 12, bottom: 28 })
const TICKS = [0, 25, 50, 75, 100]

const clampPercent = (n) => Math.max(0, Math.min(100, n ?? 0))

/** @param {{ label: string, rows: { key: string, label: string, value: number | null, display: string }[], max?: number }} props */
export function BarList({ label, rows, max = 100 }) {
  return (
    <ul className={styles.bars} aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className={styles.bar}>
          <span className={styles.barLabel} title={row.label}>
            {row.label}
          </span>
          <span className={styles.barTrack} aria-hidden="true">
            <span className={styles.barFill} style={{ width: `${clampPercent(((row.value ?? 0) / max) * 100)}%` }} />
          </span>
          <span className={styles.barValue}>{row.display}</span>
        </li>
      ))}
    </ul>
  )
}

/** @param {{ caption: string, headers: [string, string], rows: { key: string, label: string, display: string }[] }} props */
export function DataTable({ caption, headers, rows }) {
  return (
    <table className={styles.pairTable}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{headers[0]}</th>
          <th scope="col">{headers[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>{row.label}</td>
            <td className={styles.num}>{row.display}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function pointsOf(points) {
  const plotW = TREND.width - TREND.left - TREND.right
  const plotH = TREND.height - TREND.top - TREND.bottom
  const step = points.length > 1 ? plotW / (points.length - 1) : 0
  const x0 = points.length > 1 ? TREND.left : TREND.left + plotW / 2
  return points.map((p, index) => ({ ...p, x: x0 + index * step, y: TREND.top + plotH * (1 - clampPercent(p.value) / 100) }))
}

const yOf = (tick) => TREND.top + (TREND.height - TREND.top - TREND.bottom) * (1 - tick / 100)

/** Percent over time, oldest first. @param {{ label: string, points: { key: string, label: string, value: number }[] }} props */
export function TrendChart({ label, points }) {
  const placed = pointsOf(points)
  const path = placed.map((p, index) => `${index ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
  return (
    <svg className={styles.trend} viewBox={`0 0 ${TREND.width} ${TREND.height}`} role="img" aria-label={label}>
      {TICKS.map((tick) => (
        <g key={tick}>
          <line className={styles.gridLine} x1={TREND.left} x2={TREND.width - TREND.right} y1={yOf(tick)} y2={yOf(tick)} />
          <text className={styles.axisText} x={TREND.left - 8} y={yOf(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {placed.length > 1 && <path className={styles.trendLine} d={path} />}
      {placed.map((p) => (
        <g key={p.key}>
          <circle className={styles.trendDot} cx={p.x} cy={p.y} r={4}>
            <title>{`${p.label}: ${p.value} %`}</title>
          </circle>
          <text className={styles.axisText} x={p.x} y={TREND.height - 8} textAnchor="middle">
            {p.label.length > 14 ? `${p.label.slice(0, 13)}…` : p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
