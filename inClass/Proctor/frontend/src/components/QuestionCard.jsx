import { useState } from 'react'

/**
 * Remount this component (pass `key={question.id}` from the parent) when
 * navigating between questions so its local selection state resets cleanly.
 *
 * @param {{
 *   question: { id: number, question: string, options: string[] },
 *   questionNumber: number,
 *   totalQuestions: number,
 *   initialSelectedOption: number | null,
 *   isAnswered: boolean,
 *   isSaving: boolean,
 *   onSaveAnswer: (selectedOption: number) => void,
 *   error: string
 * }} props
 */
function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  initialSelectedOption,
  isAnswered,
  isSaving,
  onSaveAnswer,
  error,
}) {
  const [selectedOption, setSelectedOption] = useState(initialSelectedOption ?? null)

  return (
    <div className="card-container question-card">
      <div className="header-flex">
        <span className="badge-tag">Question {questionNumber} of {totalQuestions}</span>
        {isAnswered && <span className="badge-tag badge-tag-success">Answer Saved</span>}
      </div>

      <h3 className="question-text">{question.question}</h3>

      <div className="option-list">
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`option-item ${selectedOption === index ? 'option-selected' : ''} ${isAnswered ? 'option-locked' : ''}`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              checked={selectedOption === index}
              disabled={isAnswered}
              onChange={() => setSelectedOption(index)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="action-row" style={{ marginTop: '18px' }}>
        <button
          className="btn btn-black"
          disabled={isAnswered || selectedOption === null || isSaving}
          onClick={() => onSaveAnswer(selectedOption)}
        >
          {isSaving ? 'Saving...' : isAnswered ? 'Answer Locked' : 'Save Answer'}
        </button>
      </div>
    </div>
  )
}

export default QuestionCard
