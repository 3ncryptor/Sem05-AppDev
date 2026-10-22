import { useEffect, useMemo, useState } from 'react'
import { getQuestions, submitAnswer, submitExam } from '../api/examApi'
import QuestionCard from './QuestionCard'
import ProctorLogPanel from './ProctorLogPanel'

/**
 * @param {{
 *   sessionId: string,
 *   timer: number | string,
 *   events: Array<{ type: string, message: string, occurredAt: string }>,
 *   addProctorEvent: (sessionId: string, type: string, message: string, meta?: object) => void,
 *   onExamSubmitted: (result: { attempted: number, correct: number, wrong: number }) => void
 * }} props
 */
function ExamScreen({ sessionId, timer, events, addProctorEvent, onExamSubmitted }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false

    getQuestions()
      .then((data) => {
        if (!cancelled) setQuestions(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Could not load exam questions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Watch for the candidate leaving full screen or switching away from the exam window
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        addProctorEvent(sessionId, 'fullscreen-exit', 'Candidate exited full screen mode')
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        addProctorEvent(sessionId, 'window-blur', 'Exam window lost focus or was minimized')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [sessionId, addProctorEvent])

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const attemptedCount = Object.keys(answers).length
  const progressPercent = questions.length ? Math.round((attemptedCount / questions.length) * 100) : 0

  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < questions.length - 1

  function goToQuestion(nextIndex) {
    setAnswerError('')
    setCurrentIndex(nextIndex)
  }

  async function handleSaveAnswer(selectedOption) {
    if (!currentQuestion || selectedOption === null) return

    setSavingAnswer(true)
    setAnswerError('')

    try {
      await submitAnswer({
        sessionId,
        questionId: currentQuestion.id,
        selectedAnswer: selectedOption,
      })

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: { selectedAnswer: selectedOption },
      }))
    } catch (error) {
      setAnswerError(error.message || 'Could not save this answer. Please try again.')
    } finally {
      setSavingAnswer(false)
    }
  }

  async function handleSubmitExam() {
    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await submitExam({ sessionId })
      addProctorEvent(sessionId, 'exam-submitted', 'Candidate submitted the exam')
      onExamSubmitted(response.result)
    } catch (error) {
      setSubmitError(error.message || 'Could not submit the exam. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const unattemptedCount = useMemo(
    () => questions.length - attemptedCount,
    [questions.length, attemptedCount]
  )

  if (loading) {
    return (
      <div className="page-container">
        <div className="card-container">
          <p>Loading exam questions...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page-container">
        <div className="card-container">
          <p className="form-error">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="header-section exam-header">
        <h1>Exam In Progress</h1>
        {timer !== '' && (
          <div className="timer-badge">⏱ {Math.round(timer)}s elapsed</div>
        )}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="progress-label">{attemptedCount} of {questions.length} questions answered</p>

      {currentQuestion && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          initialSelectedOption={currentAnswer ? currentAnswer.selectedAnswer : null}
          isAnswered={Boolean(currentAnswer)}
          isSaving={savingAnswer}
          onSaveAnswer={handleSaveAnswer}
          error={answerError}
        />
      )}

      <div className="action-row exam-nav">
        <button
          className="btn btn-outline"
          disabled={!canGoPrev}
          onClick={() => goToQuestion(currentIndex - 1)}
        >
          ← Previous
        </button>
        <button
          className="btn btn-outline"
          disabled={!canGoNext}
          onClick={() => goToQuestion(currentIndex + 1)}
        >
          Next →
        </button>
      </div>

      <ProctorLogPanel events={events} compact />

      <div className="card-container submit-exam-card">
        {unattemptedCount > 0 && (
          <p className="submit-warning">
            {unattemptedCount} question{unattemptedCount === 1 ? '' : 's'} still unanswered.
          </p>
        )}
        {submitError && <p className="form-error">{submitError}</p>}
        <button className="btn btn-primary" disabled={submitting} onClick={handleSubmitExam}>
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  )
}

export default ExamScreen
