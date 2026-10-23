// Live camera preview with a face guide. Shows the shared stream from proctoring/webcam.js.
import { useEffect } from 'react'
import { getStream } from '../../proctoring/webcam.js'
import styles from './Pretest.module.css'

/**
 * @param {{ videoRef: import('react').RefObject<HTMLVideoElement>, ready: boolean, frozenUrl?: string | null }} props
 *   ready: attach the stream once the camera has started.
 */
export function CameraPreview({ videoRef, ready, frozenUrl = null }) {
  useEffect(() => {
    const element = videoRef.current
    const stream = getStream()
    if (!ready || !element || !stream || element.srcObject === stream) return
    element.srcObject = stream
    element.play().catch(() => null)
  }, [ready, videoRef])

  return (
    <div className={styles.preview}>
      <video ref={videoRef} muted playsInline aria-label="Camera preview" className={styles.video} hidden={Boolean(frozenUrl)} />
      {frozenUrl && <img src={frozenUrl} alt="Your identity photo" className={styles.video} />}
      {!frozenUrl && ready && <div className={styles.faceGuide} aria-hidden="true" />}
      {!ready && !frozenUrl && <p className={styles.previewHint}>Camera preview</p>}
    </div>
  )
}
