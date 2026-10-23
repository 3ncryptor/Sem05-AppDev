// C7 status bar: exam name · timer · save state · flags · camera dot. Every state has a word or a shape.
import { CircleCheck, CloudOff, Flag, LoaderCircle, Timer } from 'lucide-react'
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

function flagTone(count, max) {
  if (count === 0) return ''
  if (max && count >= max - 1) return styles.flagCritical
  return styles.flagAttention
}

/** @param {{ state: object, msLeft: number | null, revisionKey: number }} props */
export function StatusBar({ state, msLeft, revisionKey }) {
  const timer = timerDisplay(msLeft)
  const showFlags = Boolean(state.proctoring?.enabled)
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
        {showFlags && (
          <span className={`${styles.flags} ${flagTone(state.flagCount, state.maxFlags)}`}>
            <Flag size={14} aria-hidden="true" /> {state.flagCount}
            {state.maxFlags ? `/${state.maxFlags}` : ''}
            <span className="visually-hidden"> flags</span>
          </span>
        )}
        <CameraDot />
      </span>
    </header>
  )
}
