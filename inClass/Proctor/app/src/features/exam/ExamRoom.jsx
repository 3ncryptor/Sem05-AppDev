// C7 The exam room (+ C8 palette, C11 banners). C9 flag UI and C10 overlays arrive in Loop 3; their state
// already flows through the reducer (flags, sensors, overlay).
import { CloudOff, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { useToast } from '../../components/toastContext.js'
import { errorMessage } from '../../lib/api.js'
import { QUESTION_TYPES } from '../../question/types/index.js'
import { useExam } from './examContext.js'
import { progressOf } from './examReducer.js'
import { Palette } from './Palette.jsx'
import { Rail } from './Rail.jsx'
import { Stage } from './Stage.jsx'
import { StatusBar } from './StatusBar.jsx'
import { THRESHOLDS, useTimeLeft } from './timer.js'
import { useClipboardBlock } from './useClipboardBlock.js'
import { useShortcuts } from './useShortcuts.js'
import { useTimerMoments } from './useTimerMoments.js'
import styles from './Exam.module.css'

/** Shared by C7 and C12: the status bar, the progress hairline and the C11 banners. */
export function ExamChrome({ state, children }) {
  const toast = useToast()
  const msLeft = useTimeLeft(state.deadlineAt, state.offsetMs)
  useTimerMoments(msLeft, toast)
  const { answered, total } = progressOf(state)
  const revisionKey = Object.values(state.answers).reduce((sum, a) => sum + (a.revision ?? 0), 0)

  return (
    <div className={styles.room}>
      <StatusBar state={state} msLeft={msLeft} revisionKey={revisionKey} />
      <div className={styles.progress} role="progressbar" aria-label="Answered" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={total}>
        <span style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
      </div>
      {!state.net.online && (
        <div className={styles.banner}>
          <Banner tone="attention" icon={CloudOff}>
            You’re offline. Keep working: your answers are kept on this Mac. Don’t quit Athena.
          </Banner>
        </div>
      )}
      {msLeft !== null && msLeft > 0 && msLeft <= THRESHOLDS.critical && (
        <div className={styles.banner}>
          <Banner tone="critical" icon={TriangleAlert}>
            1 minute left: your answers are saved.
          </Banner>
        </div>
      )}
      {msLeft === 0 ? (
        <div className={styles.timesUp} role="alert">
          <h1 className={styles.timesUpTitle}>Time’s up.</h1>
          <p>Submitting your answers…</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export function ExamRoom() {
  const { attemptId } = useParams()
  const { state, actions } = useExam()
  const question = state.questions[state.index]
  useClipboardBlock(state.proctoring?.enabled ? state.proctoring.rules?.clipboard : null)

  const shortcuts = useMemo(
    () => ({
      enabled: state.status === 'ready',
      onDigit: (n) => {
        const keyChoice = question && QUESTION_TYPES[question.type]?.keyChoice
        if (!keyChoice) return
        const next = keyChoice(question, state.answers[question.id]?.response ?? null, n)
        if (next !== undefined) actions.answer(question.id, next)
      },
      onNext: actions.next,
      onPrevious: actions.previous,
      onMark: () => question && actions.toggleMark(question.id),
      onPalette: actions.togglePalette,
      onEscape: actions.closePalette,
    }),
    [state.status, state.answers, question, actions],
  )
  useShortcuts(shortcuts)

  if (state.status === 'error') {
    return (
      <div className={styles.loading}>
        <Banner tone="critical" role="alert">
          {errorMessage(state.error)}
        </Banner>
      </div>
    )
  }
  if (state.status !== 'ready') return <div className={styles.loading} aria-busy="true" />

  return (
    <ExamChrome state={state}>
      <div className={styles.body}>
        <Rail state={state} onGo={actions.go} />
        {state.paletteOpen && <Palette state={state} onGo={actions.go} />}
        <Stage state={state} actions={actions} attemptId={attemptId} />
      </div>
      <p className={styles.keyLegend} aria-hidden="true">
        1–9 choose · N/P · M mark · Q questions
      </p>
    </ExamChrome>
  )
}
