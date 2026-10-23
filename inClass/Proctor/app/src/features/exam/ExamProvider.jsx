// Holds one attempt's exam room (C7–C12): loads it, keeps it in a reducer, listens to main, saves answers.
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { useToast } from '../../components/toastContext.js'
import { api, ipc } from '../../lib/api.js'
import { ExamContext } from './examContext.js'
import { examReducer, initialExamState } from './examReducer.js'
import { readLastQuestion, writeLastQuestion } from './lastQuestion.js'
import { useMainEvents } from './useMainEvents.js'

const TICK_MS = 1000

export function ExamProvider() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [state, dispatch] = useReducer(examReducer, initialExamState)
  const stateRef = useRef(state)
  // Revisions and seconds-per-question change faster than renders, so they live in refs.
  const revisions = useRef({})
  const seconds = useRef({})

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Load (or reload after a relaunch) and make sure main is in exam mode.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const room = await api('attempts.get', { attemptId })
        if (cancelled) return
        if (room.attempt.status !== 'in_progress') return navigate(`/student/attempts/${attemptId}/done`, { replace: true })
        for (const [questionId, answer] of Object.entries(room.answers ?? {})) {
          revisions.current[questionId] = answer.revision ?? 0
          seconds.current[questionId] = answer.timeSpentSec ?? 0
        }
        const offsetMs = Date.parse(room.attempt.serverNow) - Date.now()
        dispatch({ type: 'LOADED', room, offsetMs, index: readLastQuestion(attemptId) })
        const entered = await ipc.examEnter(attemptId)
        if (!cancelled && entered?.net) dispatch({ type: 'NET', ...entered.net })
      } catch (error) {
        if (!cancelled) dispatch({ type: 'LOAD_FAILED', error })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attemptId, navigate])

  useMainEvents({ attemptId, dispatch, stateRef, toast, navigate })

  // Time per question: count visible seconds on whichever question is open.
  useEffect(() => {
    const id = setInterval(() => {
      const current = stateRef.current
      const question = current.questions[current.index]
      if (!question || document.hidden || current.status !== 'ready') return
      seconds.current[question.id] = (seconds.current[question.id] ?? 0) + 1
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (state.status === 'ready') writeLastQuestion(attemptId, state.index)
  }, [attemptId, state.index, state.status])

  /** Saves one question's answer and/or mark: bump the revision, update the UI, hand it to main's queue. */
  const save = useCallback(
    (questionId, patch) => {
      const previous = stateRef.current.answers[questionId] ?? { response: null, marked: false }
      const revision = (revisions.current[questionId] ?? 0) + 1
      revisions.current[questionId] = revision
      const answer = { ...previous, ...patch, revision, timeSpentSec: seconds.current[questionId] ?? 0 }
      dispatch({ type: 'ANSWER', questionId, answer })
      api('answers.save', {
        attemptId,
        questionId,
        revision,
        response: answer.response ?? null,
        timeSpentSec: answer.timeSpentSec,
        marked: Boolean(answer.marked),
      }).catch(() => toast('Couldn’t keep that answer. Try again.', { tone: 'critical' }))
    },
    [attemptId, toast],
  )

  const actions = useMemo(
    () => ({
      answer: (questionId, response) => save(questionId, { response }),
      toggleMark: (questionId) => save(questionId, { marked: !stateRef.current.answers[questionId]?.marked }),
      go: (index) => dispatch({ type: 'GO', index }),
      next: () => dispatch({ type: 'GO', index: stateRef.current.index + 1 }),
      previous: () => dispatch({ type: 'GO', index: stateRef.current.index - 1 }),
      togglePalette: () => dispatch({ type: 'TOGGLE_PALETTE' }),
      closePalette: () => dispatch({ type: 'CLOSE_PALETTE' }),
    }),
    [save],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return (
    <ExamContext value={value}>
      <Outlet />
    </ExamContext>
  )
}
