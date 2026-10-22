// Status chip: symbol + word, tinted by tone. Meaning never relies on colour alone (BUILD_PLAN §5.2).
import styles from './Chip.module.css'

/**
 * Pass a spec from lib/status.js (`spec`) or a tone + symbol + children directly.
 * @param {{ spec?: import('../lib/status.js').ChipSpec, tone?: string, symbol?: string, pulse?: boolean, children?: import('react').ReactNode }} props
 */
export function Chip({ spec, tone = spec?.tone ?? 'neutral', symbol = spec?.symbol, pulse = false, children = spec?.label }) {
  return (
    <span className={`${styles.chip} ${styles[tone]}`}>
      {symbol && (
        <span className={`${styles.symbol} ${pulse ? styles.pulse : ''}`} aria-hidden="true">
          {symbol}
        </span>
      )}
      {children}
    </span>
  )
}
