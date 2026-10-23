// Route layout for C3–C6: loads the exam once, keeps the pre-test state, shows the stepper.
import { RotateCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { errorMessage, ipc } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { useLocal } from '../../lib/useLocal.js'
import { PretestContext, STEP_PATHS } from './pretestContext.js'
import { QuietLayout } from './QuietLayout.jsx'

const loadInfo = () => ipc.appInfo()

export function PretestLayout() {
  const { examId } = useParams()
  const location = useLocation()
  const { data, error, refetch } = useApi('exams.get', { examId })
  const { data: info } = useLocal(loadInfo)
  const [check, setCheck] = useState(null)
  const [consent, setConsent] = useState(null)
  const [photo, setPhoto] = useState(null)
  const exam = data?.exam ?? null

  // The photo preview is an object URL; release it when it's replaced or the flow ends.
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

  const value = useMemo(
    () => ({ exam, devMode: info ? !info.isPackaged : false, check, setCheck, consent, setConsent, photo, setPhoto }),
    [exam, info, check, consent, photo],
  )
  const step = Math.max(0, STEP_PATHS.indexOf(location.pathname.split('/').pop()))

  if (exam?.myStatus === 'in_progress' && exam.openAttemptId) {
    return <Navigate to={`/student/attempts/${exam.openAttemptId}/resume`} replace />
  }
  return (
    <QuietLayout title={exam?.title} step={step}>
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {!exam && !error && <Skeleton width={360} height={24} />}
      {exam && (
        <PretestContext value={value}>
          <Outlet />
        </PretestContext>
      )}
    </QuietLayout>
  )
}
