// C14 Done: the receipt, how the exam ended, evidence state, and what happens to results. Never a score.
import { Check, FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Banner } from '../../components/Banner.jsx'
import { Button } from '../../components/Button.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { useToast } from '../../components/toastContext.js'
import { errorMessage, ipc } from '../../lib/api.js'
import { formatDateTime } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { stopCamera } from '../../proctoring/webcam.js'
import { useAuth } from '../auth/useAuth.js'
import { QuietLayout } from '../pretest/QuietLayout.jsx'
import styles from './Exam.module.css'

/** Title and explanation by how the exam ended (SCREENS C14 table). */
function endingCopy(reason, firstName, maxFlags) {
  switch (reason) {
    case 'deadline':
      return { title: 'Time’s up: your exam is submitted', line: 'Everything you answered before the deadline was saved.' }
    case 'flag_limit':
      return {
        title: 'Your exam has ended',
        line: `It ended automatically after ${maxFlags ?? 'the limit of'} flags. Your answers so far were submitted. A person will review the flags.`,
      }
    case 'admin':
      return { title: 'Your exam was ended by the examiner', line: 'Your answers so far were submitted. If you weren’t expecting this, talk to your examiner.' }
    default:
      return { title: `Your exam is submitted${firstName ? `, ${firstName}` : ''}`, line: null }
  }
}

function evidenceLine(summary) {
  if (!summary) return '…'
  if (summary.images === 0) return 'no images'
  const count = `${summary.images} image${summary.images === 1 ? '' : 's'}`
  return summary.pending === 0 ? `${count}, all uploaded ✓` : `${count}, ${summary.pending} waiting to upload`
}

export function DonePage() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { data: receipt, error } = useApi('attempts.receipt', { attemptId })
  const [evidence, setEvidence] = useState(null)
  const [saving, setSaving] = useState(false)

  // The exam is over: leave exam mode (idempotent) and release the camera.
  useEffect(() => {
    ipc.examExit().catch(() => null)
    stopCamera()
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = () => ipc.evidenceSummary(attemptId).then((summary) => !cancelled && setEvidence(summary)).catch(() => null)
    load()
    // Uploads finish after submit; refresh until everything is up.
    const id = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [attemptId])

  const onSavePdf = async () => {
    setSaving(true)
    try {
      const saved = await ipc.saveReceiptPdf(attemptId, receipt?.code)
      if (saved?.path) toast('Receipt saved.', { tone: 'ok' })
    } catch (caught) {
      toast(errorMessage(caught), { tone: 'critical' })
    } finally {
      setSaving(false)
    }
  }

  const firstName = (receipt?.studentName ?? user?.name ?? '').split(' ')[0]
  const copy = endingCopy(receipt?.submitReason, firstName, receipt?.flagCount)

  return (
    <QuietLayout>
      <article className={styles.done} aria-labelledby="done-title">
        <span className={styles.check} aria-hidden="true">
          <Check size={28} strokeWidth={2.5} />
        </span>
        {error && (
          <Banner tone="critical" role="alert">
            {errorMessage(error)}
          </Banner>
        )}
        {!receipt && !error && <Skeleton width={320} height={26} />}
        {receipt && (
          <>
            <h1 id="done-title" className={styles.doneTitle}>
              {copy.title}
            </h1>
            <div className={styles.doneLines}>
              {copy.line && <p>{copy.line}</p>}
              <p>
                We received {receipt.received} of {receipt.total} answers.
              </p>
              <p>Camera and screen capture are off.</p>
            </div>
            <section className={`${styles.receipt} print-receipt`} aria-label="Receipt">
              <p className={styles.receiptHead}>
                <span>Receipt</span>
                <span className="mono">{receipt.code}</span>
              </p>
              <p>
                {receipt.examTitle} · Attempt {receipt.attemptNo}
              </p>
              <p>
                Submitted {formatDateTime(receipt.submittedAt)} · {receipt.submitReason === 'student' ? 'by you' : copy.title.toLowerCase()}
              </p>
              <p>
                Answers {receipt.received} / {receipt.total} · Evidence {evidenceLine(evidence)}
              </p>
              {receipt.studentName && <p className="print-only">Student: {receipt.studentName}</p>}
            </section>
            <div className={styles.doneButtons}>
              <Button icon={FileDown} onClick={onSavePdf} loading={saving}>
                Save receipt (PDF)
              </Button>
            </div>
            {receipt.resultVisible ? (
              <Link to={`/student/results/${attemptId}`} className={styles.resultsLink}>
                View your results →
              </Link>
            ) : (
              <p className={styles.soft}>Results will appear when your examiner publishes them.</p>
            )}
            <div className={styles.doneFooter}>
              <Link to="/student/exams">Back to exams</Link>
            </div>
          </>
        )}
      </article>
    </QuietLayout>
  )
}
