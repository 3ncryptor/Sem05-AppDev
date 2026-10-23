// The exam room's state (BUILD_PLAN §16). A pure function: (state, action) → new state, never mutating.
// Actions come from the student (ANSWER, GO, MARK…) and from main (HEARTBEAT, NET, WARNING, SENSOR, FORCED).

export const initialExamState = Object.freeze({
  status: 'loading', // loading | ready | error
  error: null,
  attempt: null,
  exam: null,
  questions: [],
  answers: {}, // questionId → { response, revision, marked, timeSpentSec }
  index: 0,
  seen: {}, // questionId → true once shown
  deadlineAt: null,
  offsetMs: 0, // server clock − local clock
  flagCount: 0,
  maxFlags: null,
  proctoring: null,
  flags: [], // C9 (Loop 3)
  sensors: {}, // C10 (Loop 3)
  overlay: null, // C10 (Loop 3)
  net: { online: true, queued: 0 },
  paletteOpen: false,
  forced: null, // { submitReason } once the server ends the attempt
})

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function goTo(state, index) {
  const next = clamp(index, 0, Math.max(0, state.questions.length - 1))
  const question = state.questions[next]
  return { ...state, index: next, seen: question ? { ...state.seen, [question.id]: true } : state.seen }
}

/** @param {typeof initialExamState} state @param {{ type: string, [key: string]: any }} action */
export function examReducer(state, action) {
  switch (action.type) {
    case 'LOADED': {
      const { room, offsetMs, index } = action
      const loaded = {
        ...state,
        status: 'ready',
        error: null,
        attempt: room.attempt,
        exam: room.exam,
        questions: room.questions,
        answers: room.answers ?? {},
        deadlineAt: room.attempt.deadlineAt,
        offsetMs,
        flagCount: room.attempt.flagCount ?? 0,
        maxFlags: room.attempt.maxFlags ?? null,
        proctoring: room.proctoring,
        flags: room.flags ?? [],
      }
      return goTo(loaded, index)
    }
    case 'LOAD_FAILED':
      return { ...state, status: 'error', error: action.error }
    case 'ANSWER':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } }
    case 'GO':
      return goTo({ ...state, paletteOpen: false }, action.index)
    case 'TOGGLE_PALETTE':
      return { ...state, paletteOpen: !state.paletteOpen }
    case 'CLOSE_PALETTE':
      return { ...state, paletteOpen: false }
    case 'HEARTBEAT':
      return {
        ...state,
        deadlineAt: action.deadlineAt ?? state.deadlineAt,
        offsetMs: action.offsetMs ?? state.offsetMs,
        flagCount: action.flagCount ?? state.flagCount,
        maxFlags: action.maxFlags === undefined ? state.maxFlags : action.maxFlags,
      }
    case 'NET':
      return { ...state, net: { online: action.online, queued: action.queued } }
    case 'WARNING':
      return {
        ...state,
        flags: [...state.flags, action.warning],
        flagCount: Math.max(state.flagCount, action.warning.flagNo ?? state.flagCount),
      }
    case 'SENSOR':
      return { ...state, sensors: { ...state.sensors, ...action.sensors } }
    case 'FORCED':
      return { ...state, forced: { submitReason: action.submitReason } }
    default:
      return state
  }
}

/** Derived counts used by the rail, palette and review screen. */
export function progressOf(state) {
  const answered = state.questions.filter((q) => isAnsweredEntry(state.answers[q.id])).length
  const marked = state.questions.filter((q) => state.answers[q.id]?.marked).length
  return { answered, marked, total: state.questions.length }
}

export const isAnsweredEntry = (entry) => entry?.response !== null && entry?.response !== undefined

/** ● answered · ⚐ marked · ◐ seen · ○ not yet · ◉ current. Marked wins over answered so it stands out. */
export function questionState(state, question, index) {
  if (index === state.index) return 'current'
  const entry = state.answers[question.id]
  if (entry?.marked) return 'marked'
  if (isAnsweredEntry(entry)) return 'answered'
  return state.seen[question.id] ? 'seen' : 'todo'
}
