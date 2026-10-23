// "Quiet room" frame (SCREENS §0.2) for the pre-test steps and the resume card: a title row with the exam
// name and the stepper, then one centred card.
import { Stepper } from '../../components/Stepper.jsx'
import { BrandMark } from '../shell/BrandMark.jsx'
import styles from './Pretest.module.css'

/** @param {{ title?: string, step?: number, children: import('react').ReactNode }} props */
export function QuietLayout({ title, step, children }) {
  return (
    <div className={styles.quiet}>
      <header className={`drag-region ${styles.titlebar}`}>
        <span className={styles.brandLine}>
          <BrandMark />
          {title && <span className={styles.examName}>· {title}</span>}
        </span>
        {step !== undefined && <Stepper steps={['Setup', 'Rules', 'Photo', 'Begin']} current={step} />}
      </header>
      <main className={styles.stage}>{children}</main>
    </div>
  )
}
