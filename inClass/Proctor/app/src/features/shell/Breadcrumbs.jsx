// Admin breadcrumbs in the title-bar row (SCREENS A0). Built from each route's `handle.crumb`.
import { Link, useMatches } from 'react-router'
import { useExamTitles } from './examTitles.js'
import styles from './Shell.module.css'

export function Breadcrumbs() {
  const matches = useMatches()
  const { titles } = useExamTitles()
  const crumbs = matches
    .filter((match) => match.handle?.crumb)
    .map((match) => {
      const crumb = match.handle.crumb
      const label = crumb === 'exam' ? (titles[match.params.examId] ?? 'Exam') : crumb
      return { label, to: match.pathname }
    })
    // Index routes repeat their parent's path; keep the last label for each path.
    .filter((crumb, index, list) => list.findLastIndex((other) => other.to === crumb.to) === index)

  if (crumbs.length === 0) return null
  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.crumbs}>
        {crumbs.map((crumb, index) => (
          <li key={crumb.to}>
            {index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link to={crumb.to}>{crumb.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
