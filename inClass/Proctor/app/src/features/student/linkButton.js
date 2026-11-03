// Router links that look like the shared Button: reuses Button.module.css rather than forking its styles.
import button from '../../components/Button.module.css'
import styles from './Student.module.css'

/** @param {'primary' | 'secondary' | 'ghost'} variant @param {'md' | 'lg'} size */
export const linkButton = (variant = 'secondary', size = 'md') =>
  [button.button, button[variant], size === 'lg' ? button.lg : '', styles.linkButton].filter(Boolean).join(' ')
