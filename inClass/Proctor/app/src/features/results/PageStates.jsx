// Loading and error states shared by the results screens (SCREENS §0.5).
import { RotateCw } from 'lucide-react'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { errorMessage } from '../../lib/api.js'
import styles from './Results.module.css'

export function LoadError({ error, onRetry }) {
  return (
    <div className={styles.page}>
      <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={onRetry}>Retry</Button>}>
        {errorMessage(error)}
      </Banner>
    </div>
  )
}

export function LoadingRows({ rows = 4 }) {
  return (
    <div className={styles.page} aria-busy="true">
      <Skeleton width={240} height={28} />
      <div className={styles.loading}>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} height={44} />
        ))}
      </div>
    </div>
  )
}
