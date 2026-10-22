import styles from './Choice.module.css'

/** @param {{ label: import('react').ReactNode, description?: string } & import('react').InputHTMLAttributes<HTMLInputElement>} props */
export function Radio({ label, description, className = '', ...rest }) {
  return (
    <label className={`${styles.choice} ${className}`}>
      <input type="radio" className={styles.input} {...rest} />
      <span className={`${styles.box} ${styles.radio}`} aria-hidden="true" />
      <span className={styles.text}>
        <span>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  )
}

/**
 * A labelled group of radios. Arrow keys move between them (native behaviour for same-name radios).
 * @param {{ legend: string, hideLegend?: boolean, name: string, value: string, onChange: (value: string) => void,
 *           options: { value: string, label: string, description?: string }[], inline?: boolean, disabled?: boolean }} props
 */
export function RadioGroup({ legend, hideLegend = false, name, value, onChange, options, inline = false, disabled = false }) {
  return (
    <fieldset className={`${styles.group} ${inline ? styles.inline : ''}`} disabled={disabled}>
      <legend className={hideLegend ? 'visually-hidden' : styles.legend}>{legend}</legend>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          description={option.description}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
      ))}
    </fieldset>
  )
}
