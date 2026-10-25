// A10a: one image large, with previous / next (buttons or ← →). Native <dialog>, wider than the shared Dialog.
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../../../components/Button.jsx'
import { EvidenceImage } from './EvidenceImage.jsx'
import { bareFileName } from './imageLoader.js'
import styles from './Review.module.css'

function useArrowKeys(open, onPrev, onNext) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') onPrev()
      if (event.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onPrev, onNext])
}

/**
 * @param {{ attemptId: string, kind: string, kindLabel: string, captures: object[], index: number | null,
 *           onIndex: (index: number | null) => void, timeLabel: (capture: object) => string }} props
 */
export function Lightbox({ attemptId, kind, kindLabel, captures, index, onIndex, timeLabel }) {
  const ref = useRef(null)
  const open = index !== null && Boolean(captures[index])
  const capture = open ? captures[index] : null
  const onPrev = () => open && index > 0 && onIndex(index - 1)
  const onNext = () => open && index < captures.length - 1 && onIndex(index + 1)
  useArrowKeys(open, onPrev, onNext)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const onCancel = (event) => {
    event.preventDefault()
    onIndex(null)
  }

  return (
    <dialog ref={ref} className={styles.lightbox} onCancel={onCancel} aria-label={`${kindLabel} image`}>
      {capture && (
        <div className={styles.lightboxPanel}>
          <header className={styles.lightboxHeader}>
            <span>
              {kindLabel} · image {index + 1} of {captures.length} · {timeLabel(capture)}
            </span>
            <button type="button" className={styles.iconButton} onClick={() => onIndex(null)} aria-label="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          <EvidenceImage
            key={capture.file}
            eager
            attemptId={attemptId}
            kind={kind}
            file={bareFileName(capture.file)}
            alt={`${kindLabel} at ${timeLabel(capture)}`}
            className={styles.lightboxImage}
          />
          <footer className={styles.lightboxFooter}>
            <Button icon={ChevronLeft} onClick={onPrev} disabled={index === 0}>
              Previous
            </Button>
            <Button icon={ChevronRight} onClick={onNext} disabled={index === captures.length - 1}>
              Next
            </Button>
          </footer>
        </div>
      )}
    </dialog>
  )
}
