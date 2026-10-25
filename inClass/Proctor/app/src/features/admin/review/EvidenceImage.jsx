// One saved exam image, loaded lazily through IPC, with skeleton and error states.
import { ImageOff } from 'lucide-react'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { useAdminImage, useSeen } from './imageLoader.js'
import styles from './Review.module.css'

/**
 * @param {{ attemptId: string, kind: 'screen' | 'camera' | 'identity', file: string, alt: string, className?: string, eager?: boolean }} props
 */
export function EvidenceImage({ attemptId, kind, file, alt, className = '', eager = false }) {
  const [ref, seen] = useSeen()
  const { src, error } = useAdminImage(attemptId, kind, file, eager || seen)
  return (
    <div ref={ref} className={`${styles.imageBox} ${className}`}>
      {src && <img src={src} alt={alt} className={styles.image} />}
      {error && (
        <span className={styles.imageError} title={error.message}>
          <ImageOff size={18} aria-hidden="true" />
          <span>Image unavailable</span>
        </span>
      )}
      {!src && !error && <Skeleton width="100%" height="100%" radius={0} />}
    </div>
  )
}
