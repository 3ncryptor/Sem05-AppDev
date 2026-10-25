// The A5 form sections. Each gets the form, a field setter and the error map; none keeps state.
import { Card } from '../../../components/Card.jsx'
import { Input } from '../../../components/Input.jsx'
import { RadioGroup } from '../../../components/Radio.jsx'
import { Switch } from '../../../components/Switch.jsx'
import { Textarea } from '../../../components/Textarea.jsx'
import { SHOT_LIMITS } from './settingsForm.js'
import styles from './Settings.module.css'

const LOCKED = 'Locked: a student has already started'

const VISIBILITY_OPTIONS = [
  { value: 'after_submit', label: 'Right after the student submits', description: 'Suits practice tests.' },
  { value: 'after_publish', label: 'When I publish', description: 'Stops answers spreading while others still write.' },
]

/** onChange handler for a text-like input bound to `key`. */
const text = (set, key) => (event) => set(key, event.target.value)

function Section({ title, children }) {
  return (
    <Card>
      <h2 className={styles.section}>{title}</h2>
      <div className={styles.fields}>{children}</div>
    </Card>
  )
}

export function TimingSection({ form, set, errors, locked }) {
  return (
    <Section title="Timing & window">
      <div className={styles.row}>
        <Input
          label="Duration (minutes)"
          type="number"
          min={1}
          max={600}
          value={form.durationMinutes}
          onChange={text(set, 'durationMinutes')}
          error={errors.durationMinutes}
          disabled={locked.duration}
          title={locked.duration ? LOCKED : undefined}
          hint={locked.duration ? LOCKED : undefined}
        />
      </div>
      <div className={styles.row}>
        <Input label="Window opens" type="datetime-local" value={form.opensAt} onChange={text(set, 'opensAt')} error={errors.opensAt} />
        <Input label="Window closes" type="datetime-local" value={form.closesAt} onChange={text(set, 'closesAt')} error={errors.closesAt} />
      </div>
      <p className={styles.hint}>A late start gets only the time left before the window closes.</p>
    </Section>
  )
}

export function AttemptsSection({ form, set, errors, locked }) {
  return (
    <Section title="Attempts & order">
      <div className={styles.row}>
        <Input
          label="Attempts allowed"
          type="number"
          min={1}
          max={10}
          value={form.maxAttempts}
          onChange={text(set, 'maxAttempts')}
          error={errors.maxAttempts}
          disabled={locked.attempts}
          title={locked.attempts ? LOCKED : undefined}
          hint={locked.attempts ? LOCKED : undefined}
        />
      </div>
      <div className={styles.switches}>
        <Switch label="Shuffle questions" checked={form.shuffleQuestions} onChange={(event) => set('shuffleQuestions', event.target.checked)} />
        <Switch label="Shuffle options" checked={form.shuffleOptions} onChange={(event) => set('shuffleOptions', event.target.checked)} />
      </div>
    </Section>
  )
}

export function TextsSection({ form, set, errors }) {
  return (
    <Section title="Instructions & terms">
      <Textarea
        label="Instructions"
        hint="Shown on the exam page and the rules step."
        rows={4}
        maxLength={5000}
        value={form.instructions}
        onChange={text(set, 'instructions')}
        error={errors.instructions}
      />
      <Textarea
        label="Platform terms"
        hint="Students accept these before starting. Changing them asks students to accept again."
        rows={8}
        maxLength={20000}
        value={form.terms}
        onChange={text(set, 'terms')}
        error={errors.terms}
      />
    </Section>
  )
}

export function ResultsSection({ form, set, errors }) {
  return (
    <Section title="Results">
      <RadioGroup legend="Show results" name="visibility" value={form.visibility} onChange={(value) => set('visibility', value)} options={VISIBILITY_OPTIONS} />
      <div className={styles.row}>
        <Input
          label="Pass mark (%)"
          type="number"
          min={0}
          max={100}
          value={form.passPercent}
          onChange={text(set, 'passPercent')}
          error={errors['resultPolicy.passPercent'] ?? errors.resultPolicy}
        />
      </div>
    </Section>
  )
}

export function ScreenshotsSection({ form, set, errors, locked }) {
  const hint = locked ? 'Locked: a student has already started' : 'A screen and a webcam picture are saved at a random moment in this range.'
  return (
    <Section title="Screenshots">
      <div className={styles.row}>
        <Input
          label="Every (min seconds)"
          type="number"
          min={SHOT_LIMITS.MIN}
          max={SHOT_LIMITS.MAX}
          value={form.minSec}
          onChange={text(set, 'minSec')}
          error={errors['screenshots.minSec']}
          disabled={locked}
        />
        <Input
          label="To (max seconds)"
          type="number"
          min={SHOT_LIMITS.MIN}
          max={SHOT_LIMITS.MAX}
          value={form.maxSec}
          onChange={text(set, 'maxSec')}
          error={errors['screenshots.maxSec']}
          disabled={locked}
        />
      </div>
      <p className={styles.hint}>{hint}</p>
    </Section>
  )
}
