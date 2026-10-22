import styles from './Misc.module.css'

/** Placeholder block while data loads. Screens show skeletons, never a window-wide spinner (SCREENS §0.5). */
export function Skeleton({ width = '100%', height = 14, radius = 6, className = '' }) {
  return <span className={`${styles.skeleton} ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}
