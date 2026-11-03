// "Quiet room" frame (DESIGN.md "Pre-test") for the pre-test steps, the resume screen and the done page:
// a slim title bar (brand and exam name left, stepper centred), then one centred 640 px column, no card.
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
          {title && <span className={styles.examName}>{title}</span>}
        </span>
        {step !== undefined && <Stepper steps={['Setup', 'Rules', 'Photo', 'Begin']} current={step} />}
        <span aria-hidden="true" />
      </header>
      <main className={styles.stage}>
        <div className={`page-enter ${styles.column}`}>{children}</div>
      </main>
    </div>
  )
}
