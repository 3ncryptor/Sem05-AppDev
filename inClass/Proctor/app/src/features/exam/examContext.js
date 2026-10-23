import { createContext, useContext } from 'react'

/** @type {import('react').Context<{ state: object, actions: object } | null>} */
export const ExamContext = createContext(null)

export function useExam() {
  const value = useContext(ExamContext)
  if (!value) throw new Error('useExam must be used inside <ExamProvider>')
  return value
}
