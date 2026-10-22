// Pre-test steps (C3–C6). Done steps show ✓, the current one is marked for screen readers with aria-current.
import { Check } from 'lucide-react'
import styles from './Stepper.module.css'

/** @param {{ steps: string[], current: number }} props  current is 0-based */
export function Stepper({ steps, current }) {
  return (
    <ol className={styles.stepper}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li key={step} className={`${styles.step} ${styles[state]}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={styles.marker} aria-hidden="true">
              {state === 'done' ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <span>{step}</span>
            {state === 'done' && <span className="visually-hidden">(done)</span>}
          </li>
        )
      })}
    </ol>
  )
}
