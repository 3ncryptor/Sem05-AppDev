import ProctorLogPanel from './ProctorLogPanel'

/**
 * @param {{
 *   candidateName: string,
 *   results: { attempted: number, correct: number, wrong: number },
 *   events: Array<{ type: string, message: string, occurredAt: string }>
 * }} props
 */
function SubmissionScreen({ candidateName, results, events }) {
  const { attempted, correct, wrong } = results

  return (
    <div className="page-container">
      <div className="header-section">
        <h1>Exam Submitted</h1>
        <p>Thank you, {candidateName || 'candidate'}. Your responses have been recorded.</p>
      </div>

      <div className="card-container score-summary">
        <div className="score-stat">
          <span className="score-value">{attempted}</span>
          <span className="score-label">Attempted</span>
        </div>
        <div className="score-stat score-correct">
          <span className="score-value">{correct}</span>
          <span className="score-label">Correct</span>
        </div>
        <div className="score-stat score-wrong">
          <span className="score-value">{wrong}</span>
          <span className="score-label">Wrong</span>
        </div>
      </div>

      <ProctorLogPanel events={events} />
    </div>
  )
}

export default SubmissionScreen
