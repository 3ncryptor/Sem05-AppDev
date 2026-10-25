// C7 status bar: exam name · timer · save state · camera dot. Every state has a word or a shape.
import { CircleCheck, CloudOff, LoaderCircle, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isLive, onCameraChange } from '../../proctoring/webcam.js'
import { BrandMark } from '../shell/BrandMark.jsx'
import { timerDisplay } from './timer.js'
import styles from './Exam.module.css'

/** "✓ Saved" fades out 2 s after each save (a CSS animation restarted by `key`, so no timers). */
function SaveState({ net, revisionKey }) {
  if (!net.online) {
    return (
      <span className={`${styles.save} ${styles.offline}`}>
        <CloudOff size={14} aria-hidden="true" /> Offline · {net.queued} kept
      </span>
    )
  }
  if (net.queued > 0) {
    return (
      <span className={styles.save}>
        <LoaderCircle size={14} aria-hidden="true" className={styles.spin} /> {net.queued > 1 ? `Syncing ${net.queued}…` : 'Saving…'}
      </span>
    )
  }
  return (
    <span key={revisionKey} className={`${styles.save} ${styles.savedFade}`}>
      <CircleCheck size={14} aria-hidden="true" /> Saved
    </span>
  )
}

function CameraDot() {
  const [live, setLive] = useState(isLive())
  useEffect(() => onCameraChange(setLive), [])
  return (
    <span className={styles.camera} title={live ? 'Camera on' : 'Camera off'}>
      <span className={`${styles.dot} ${live ? styles.dotLive : styles.dotLost}`} aria-hidden="true" />
      <span className="visually-hidden">{live ? 'Camera on' : 'Camera off'}</span>
    </span>
  )
}

/** @param {{ state: object, msLeft: number | null, revisionKey: number }} props */
export function StatusBar({ state, msLeft, revisionKey }) {
  const timer = timerDisplay(msLeft)
  return (
    <header className={`drag-region ${styles.statusBar}`}>
      <span className={styles.examTitle}>
        <BrandMark showName={false} />
        {state.exam?.title}
      </span>
      <span className={`${styles.timer} ${styles[`timer_${timer.tone}`] ?? ''}`} role="timer" aria-live="off">
        <Timer size={15} aria-hidden="true" /> {timer.text}
      </span>
      <span className={styles.statusRight} aria-live="polite">
        <SaveState net={state.net} revisionKey={revisionKey} />
        <CameraDot />
      </span>
    </header>
  )
}
