// A7 Publish checklist: a dry run lists every problem and warning, then Publish sends it for real.
// Also the Unpublish confirmation, since both live behind the exam header's one primary action.
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { formatWhen, plural } from '../../../lib/format.js'
import { useApi, useMutation } from '../../../lib/useApi.js'
import styles from './Exams.module.css'

// Proctoring was removed from the product, so its checklist warnings are noise.
const isRelevant = (item) => item.target !== 'proctoring'

const TARGET_LABEL = { questions: 'Questions', settings: 'Settings' }

function summaryLine(summary) {
  return [
    plural(summary.questionCount, 'question'),
    plural(summary.totalMarks, 'mark'),
    `${summary.durationMinutes} min`,
    summary.opensAt ? `opens ${formatWhen(summary.opensAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function ItemGroup({ symbol, tone, title, items, onGo }) {
  if (items.length === 0) return null
  return (
    <div className={styles.group}>
      <p className={`${styles.groupTitle} ${styles[tone]}`}>
        <span aria-hidden="true">{symbol}</span> {title}
      </p>
      <ul className={styles.items}>
        {items.map((item, index) => (
          <li key={`${item.code}-${item.questionId ?? index}`} className={styles.item}>
            <span>
              <span aria-hidden="true" className={styles[tone]}>{symbol}</span> {item.message}
            </span>
            {TARGET_LABEL[item.target] && (
              <Button variant="ghost" onClick={() => onGo(item.target)}>
                {TARGET_LABEL[item.target]}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Checklist({ result, onGo }) {
  const problems = result.problems
  const warnings = result.warnings.filter(isRelevant)
  return (
    <div className={styles.checklist}>
      <ItemGroup symbol="✕" tone="problem" title={`${plural(problems.length, 'problem')} must be fixed`} items={problems} onGo={onGo} />
      <ItemGroup symbol="⚠" tone="warning" title={`${plural(warnings.length, 'thing')} to check (won't block)`} items={warnings} onGo={onGo} />
      <p>
        <span aria-hidden="true" className={styles.ok}>✓</span> {summaryLine(result.summary)}
      </p>
      <p className={styles.note}>After publishing, questions are locked. Settings stay editable within limits.</p>
    </div>
  )
}

function PublishBody({ examId, onClose, onDone }) {
  const navigate = useNavigate()
  const toast = useToast()
  const dryRun = useApi('admin.exams.publish', { examId, dryRun: true })
  const publish = useMutation('admin.exams.publish')
  const [failure, setFailure] = useState(null)
  const result = dryRun.data

  const goTo = (target) => {
    onClose()
    navigate(`/admin/exams/${examId}/${target}`)
  }
  const confirm = async () => {
    setFailure(null)
    try {
      await publish.run({ examId, dryRun: false })
      toast('Published. Students can see it now.', { tone: 'ok' })
      onDone()
    } catch (error) {
      setFailure(errorMessage(error))
      dryRun.refetch()
    }
  }

  const footer = (
    <>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={confirm} loading={publish.loading} disabled={!result?.publishable}>
        Publish
      </Button>
    </>
  )
  return (
    <Dialog open onClose={onClose} title="Publish this exam?" footer={footer}>
      {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
      {dryRun.loading && !result && (
        <div className={styles.checklist} aria-busy="true">
          <Skeleton width="70%" />
          <Skeleton width="50%" />
        </div>
      )}
      {dryRun.error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={dryRun.refetch}>Retry</Button>}>
          {errorMessage(dryRun.error)}
        </Banner>
      )}
      {result && <Checklist result={result} onGo={goTo} />}
    </Dialog>
  )
}

function UnpublishBody({ examId, onClose, onDone }) {
  const toast = useToast()
  const unpublish = useMutation('admin.exams.unpublish')
  const [failure, setFailure] = useState(null)
  const confirm = async () => {
    setFailure(null)
    try {
      await unpublish.run({ examId })
      toast('Back to draft. Students no longer see it.', { tone: 'ok' })
      onDone()
    } catch (error) {
      setFailure(errorMessage(error))
    }
  }
  const footer = (
    <>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={confirm} loading={unpublish.loading}>
        Unpublish
      </Button>
    </>
  )
  return (
    <Dialog open onClose={onClose} title="Unpublish this exam?" description="It goes back to draft and students stop seeing it. Only possible while nobody has started." footer={footer}>
      {failure && <Banner tone="critical" role="alert">{failure}</Banner>}
    </Dialog>
  )
}

/**
 * Mount it only while open, so every opening runs a fresh dry run.
 * @param {{ examId: string, mode: 'publish' | 'unpublish', onClose: () => void, onDone: () => void }} props
 */
export function PublishDialog({ mode, ...props }) {
  return mode === 'unpublish' ? <UnpublishBody {...props} /> : <PublishBody {...props} />
}
