// Thumbnails of one kind of capture (screen or webcam) in time order; a click opens the lightbox.
import { Images } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { EvidenceImage } from './EvidenceImage.jsx'
import { bareFileName } from './imageLoader.js'
import { Lightbox } from './Lightbox.jsx'
import { captureTimeLabel } from './reviewModel.js'
import styles from './Review.module.css'

/**
 * @param {{ attemptId: string, kind: 'screen' | 'camera', kindLabel: string, captures: object[] }} props
 */
export function Gallery({ attemptId, kind, kindLabel, captures }) {
  const [openIndex, setOpenIndex] = useState(null)
  if (captures.length === 0) {
    return (
      <EmptyState icon={Images} title={`No ${kindLabel.toLowerCase()} images`}>
        Images are saved every minute or so while the student writes.
      </EmptyState>
    )
  }
  return (
    <>
      <ul className={styles.gallery}>
        {captures.map((capture, index) => (
          <li key={capture.file}>
            <button type="button" className={styles.thumb} onClick={() => setOpenIndex(index)}>
              <EvidenceImage
                attemptId={attemptId}
                kind={kind}
                file={bareFileName(capture.file)}
                alt={`${kindLabel} at ${captureTimeLabel(capture)}`}
                className={styles.thumbImage}
              />
              <span className={styles.thumbLabel}>{captureTimeLabel(capture)}</span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        attemptId={attemptId}
        kind={kind}
        kindLabel={kindLabel}
        captures={captures}
        index={openIndex}
        onIndex={setOpenIndex}
        timeLabel={captureTimeLabel}
      />
    </>
  )
}
