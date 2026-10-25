// admin.exams.get sends questions without their own problem list; it sends the exam checklist instead.
// This attaches each "Q3 …: no correct option" back to its question for the outline's ⚠.

/** @param {{ questions: object[], problems?: { questionId?: string, message: string }[] }} exam */
export function questionsWithProblems(exam) {
  const byQuestion = new Map()
  for (const problem of exam.problems ?? []) {
    if (!problem.questionId) continue
    const phrase = problem.message.slice(problem.message.lastIndexOf(': ') + 2)
    byQuestion.set(problem.questionId, [...(byQuestion.get(problem.questionId) ?? []), phrase])
  }
  return (exam.questions ?? []).map((q) => ({ ...q, problems: q.problems ?? byQuestion.get(q.id) ?? [] }))
}
