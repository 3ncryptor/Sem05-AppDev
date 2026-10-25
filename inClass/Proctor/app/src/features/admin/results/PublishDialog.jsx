// A11a: publish results. A dry run fills the counts; the confirm button publishes for real.
import { useEffect, useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { useToast } from '../../../components/toastContext.js'
import { api, errorMessage } from '../../../lib/api.js'
import { plural } from '../../../lib/format.js'
import { useMutation } from '../../../lib/useApi.js'
import styles from './Results.module.css'

function useDryRun(examId, open) {
  const [state, setState] = useState({ counts: null, error: null })
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    api('admin.results.publish', { examId, dryRun: true })
      .then((counts) => !cancelled && setState({ counts, error: null }))
      .catch((error) => !cancelled && setState({ counts: null, error }))
    return () => {
      cancelled = true
    }
  }, [examId, open])
  return state
}

function Counts({ counts }) {
  const { outcomes } = counts
  return (
    <div className={styles.dialogBody}>
      <p>
        Will be visible to <strong>{plural(counts.willPublish, 'student')}</strong>: score, percent, outcome, and every
        question with the key and explanation.
      </p>
      {counts.held > 0 && <p>Not included: {counts.held} held.</p>}
      <p>
        Outcomes: {outcomes.passed} Passed · {outcomes.notPassed} Not passed
        {outcomes.disqualified > 0 ? ` · ${outcomes.disqualified} Disqualified` : ''}
      </p>
      {counts.windowOpen && <p className={styles.muted}>The exam is still open. Students who submit later see results as soon as they submit.</p>}
    </div>
  )
}

export function PublishDialog({ open, onClose, examId, examTitle, onPublished }) {
  const { counts, error } = useDryRun(examId, open)
  const publish = useMutation('admin.results.publish')
  const toast = useToast()

  const confirm = async () => {
    try {
      await publish.run({ examId, dryRun: false })
      toast('Results published', { tone: 'ok' })
      onPublished()
      onClose()
    } catch (publishError) {
      toast(errorMessage(publishError), { tone: 'critical' })
    }
  }

  const ready = counts && !error
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Publish results · ${examTitle ?? ''}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} loading={publish.loading} disabled={!ready}>
            {ready ? `Publish ${plural(counts.willPublish, 'result')}` : 'Publish'}
          </Button>
        </>
      }
    >
      {error && <Banner tone="critical">{errorMessage(error)}</Banner>}
      {!error && !counts && (
        <div className={styles.dialogBody} aria-busy="true">
          <Skeleton width="80%" />
          <Skeleton width="60%" />
        </div>
      )}
      {ready && <Counts counts={counts} />}
    </Dialog>
  )
}
