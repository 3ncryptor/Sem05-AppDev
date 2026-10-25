// The exam an exam tab works on: shared from ExamWorkspace's Outlet context, or fetched if a tab is mounted alone.
import { useOutletContext, useParams } from 'react-router'
import { useApi } from '../../../lib/useApi.js'

/** @returns {{ exam: object | undefined, error: unknown, refetch: () => void }} */
export function useWorkspaceExam() {
  const context = useOutletContext()
  const { examId } = useParams()
  const own = useApi(context ? null : 'admin.exams.get', { examId })
  if (context) return { exam: context.exam ?? undefined, error: null, refetch: context.refetch }
  return { exam: own.data?.exam, error: own.error, refetch: own.refetch }
}
