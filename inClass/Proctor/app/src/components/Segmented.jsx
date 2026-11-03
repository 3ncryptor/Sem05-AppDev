// Segmented control (DESIGN.md "Filter tabs"): a sunk track with the active segment raised on --surface.
// Buttons with aria-pressed inside role="group", the same pattern the screens' hand-rolled filters use.
//
// Props:
//   label     string                     accessible name of the group (required)
//   options   { value: string, label: ReactNode, count?: number }[]
//   value     string                     the selected option's value
//   onChange  (value: string) => void
//   size      'md' | 'lg'                32 px (default) or 40 px tall
//   className string                     extra class on the track
//
// Screens that keep their own markup can reuse the look by importing the CSS module directly:
//   import seg from '../../components/Segmented.module.css'
//   <div className={seg.track} role="group"><button className={seg.segment} aria-pressed={...}>... <span className={seg.count}>
import styles from './Segmented.module.css'

/**
 * @param {{ label: string, options: { value: string, label: import('react').ReactNode, count?: number }[], value: string,
 *           onChange: (value: string) => void, size?: 'md' | 'lg', className?: string }} props
 */
export function Segmented({ label, options, value, onChange, size = 'md', className = '' }) {
  return (
    <div className={[styles.track, size === 'lg' ? styles.lg : '', className].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={styles.segment} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
