import { createContext, useContext } from 'react'

/**
 * Exam titles the workspace has loaded, keyed by id, so the admin title bar can show
 * "Exams / Electron Apps / Live" without fetching the exam a second time.
 * @type {import('react').Context<{ titles: Record<string, string>, setTitle: (id: string, title: string) => void } | null>}
 */
export const ExamTitlesContext = createContext(null)

export function useExamTitles() {
  const value = useContext(ExamTitlesContext)
  if (!value) throw new Error('useExamTitles must be used inside the admin shell')
  return value
}
