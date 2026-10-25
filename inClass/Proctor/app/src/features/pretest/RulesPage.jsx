// C4 Step 2 · Rules, terms and consent. Consent stays in memory and goes with attempts.start in C6.
import { ArrowLeftRight, Check, Clock, Copy } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { Checkbox } from '../../components/Checkbox.jsx'
import { usePretest } from './pretestContext.js'
import { CAPTURE_ITEMS, examRules } from './rulesModel.js'
import styles from './Pretest.module.css'

const RULE_ICONS = { clipboard: Copy }

function Line({ icon: Icon, children }) {
  return (
    <li className={styles.ruleLine}>
      <Icon size={16} aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

export function RulesPage() {
  const { exam, check, consent, setConsent } = usePretest()
  const navigate = useNavigate()
  const proctored = Boolean(exam.proctoring?.enabled)
  const [ticks, setTicks] = useState(() => ({ camera: proctored ? Boolean(consent) : true, screen: proctored ? Boolean(consent) : true, events: proctored ? Boolean(consent) : true, terms: Boolean(consent) }))

  if (!check?.passed) return <Navigate to="../check" replace />

  const rules = examRules(exam)
  const needed = proctored ? 4 : 1
  const ticked = (proctored ? ['camera', 'screen', 'events', 'terms'] : ['terms']).filter((key) => ticks[key]).length
  const ready = ticked === needed
  const toggle = (key) => setTicks((current) => ({ ...current, [key]: !current[key] }))
  const onContinue = () => {
    setConsent({ capture: proctored, events: proctored, terms: true, termsVersion: exam.termsVersion })
    navigate('../photo')
  }

  return (
    <article className={styles.card} aria-labelledby="rules-title">
      <h1 id="rules-title" className={styles.title}>
        Before you begin
      </h1>
      <section className={styles.block}>
        <h2 className={styles.label}>How the exam works</h2>
        <ul className={styles.ruleList}>
          <Line icon={Clock}>
            {exam.durationMinutes} minutes. The clock starts when you press Begin and doesn’t pause, even if you lose connection or quit.
          </Line>
          <Line icon={Check}>Answers save automatically, even offline.</Line>
          <Line icon={ArrowLeftRight}>You can change any answer until you submit.</Line>
        </ul>
      </section>
      {proctored && (
        <>
          {rules.length > 0 && (
            <section className={styles.block}>
              <h2 className={styles.label}>The rules</h2>
              <ul className={styles.ruleList}>
                {rules.map((rule) => (
                  <Line key={rule.icon} icon={RULE_ICONS[rule.icon]}>
                    {rule.text}
                  </Line>
                ))}
              </ul>
            </section>
          )}
          <section className={styles.block}>
            <h2 className={styles.label}>What Athena captures</h2>
            <div className={styles.checks}>
              {CAPTURE_ITEMS.map((item) => (
                <Checkbox key={item.id} label={item.label} checked={ticks[item.id]} onChange={() => toggle(item.id)} />
              ))}
            </div>
            <p className={styles.soft}>Saved in your examiner’s screenshots folder, under your name and this exam.</p>
          </section>
        </>
      )}
      <section className={styles.block}>
        <h2 className={styles.label}>Platform terms</h2>
        <div className={styles.terms} tabIndex={0} role="document" aria-label="Platform terms">
          {exam.terms || 'No terms were provided for this exam.'}
        </div>
        <Checkbox label="I have read and agree to the platform terms" checked={ticks.terms} onChange={() => toggle('terms')} />
      </section>
      <div className={styles.footer}>
        <Button onClick={() => navigate('../check')}>‹ Back</Button>
        <span className={styles.footerRight}>
          {!ready && <span className={styles.soft}>{needed === 4 ? 'All four are needed' : 'Please agree to the terms'}</span>}
          <Button variant="primary" onClick={onContinue} disabled={!ready}>
            I agree, continue →
          </Button>
        </span>
      </div>
    </article>
  )
}
