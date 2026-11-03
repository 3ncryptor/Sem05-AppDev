// C14 Done: a display-serif headline, how the exam ended, the receipt card (code in mono), evidence state and
// what happens to results. Never a score.
import { ArrowRight, Check, ChevronLeft, FileDown } from 'lucide-react'
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
        {error && (
          <Banner tone="critical" role="alert">
            {errorMessage(error)}
          </Banner>
        )}
        {!receipt && !error && <Skeleton width={420} height={44} />}
        {receipt && (
          <>
            <header className={styles.doneHead}>
              <p className={styles.doneKicker}>
                <Check size={14} aria-hidden="true" /> Submitted
              </p>
              <h1 id="done-title" className={styles.doneTitle}>
                {copy.title}
              </h1>
              <div className={styles.doneLines}>
                {copy.line && <p>{copy.line}</p>}
                <p>
                  We received {receipt.received} of {receipt.total} answers. Camera and screen capture are off.
                </p>
              </div>
            </header>
            <section className={`${styles.receipt} print-receipt`} aria-label="Receipt">
              <div className={styles.receiptHead}>
                <span className={styles.receiptLabel}>Receipt</span>
                <span className={styles.receiptCode}>{receipt.code}</span>
              </div>
              <dl className={styles.receiptRows}>
                <div>
                  <dt>Exam</dt>
                  <dd>
                    {receipt.examTitle} · Attempt {receipt.attemptNo}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>
                    {formatDateTime(receipt.submittedAt)} · {receipt.submitReason === 'student' ? 'by you' : copy.title.toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt>Answers</dt>
                  <dd>
                    {receipt.received} / {receipt.total}
                  </dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{evidenceLine(evidence)}</dd>
                </div>
                {receipt.studentName && (
                  <div className="print-only">
                    <dt>Student</dt>
                    <dd>{receipt.studentName}</dd>
                  </div>
                )}
              </dl>
            </section>
            <div className={styles.doneActions}>
              <Button icon={FileDown} size="lg" onClick={onSavePdf} loading={saving}>
                Save receipt (PDF)
              </Button>
              {receipt.resultVisible ? (
                <Link to={`/student/results/${attemptId}`} className={styles.resultsLink}>
                  View your results <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : (
                <p className={styles.soft}>Results will appear when your examiner publishes them.</p>
              )}
            </div>
            <div className={styles.doneFooter}>
              <Link to="/student/exams" className={styles.backLink}>
                <ChevronLeft size={14} aria-hidden="true" /> Back to exams
              </Link>
            </div>
          </>
        )}
      </article>
    </QuietLayout>
  )
}
