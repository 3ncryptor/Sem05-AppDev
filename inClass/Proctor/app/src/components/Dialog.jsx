// Sheet-style dialog (BUILD_PLAN §5.2) built on the native <dialog>: showModal() traps focus, Esc closes,
// and the page behind becomes inert. Sheet reuses it, docked to the right.
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import styles from './Dialog.module.css'

/**
 * @param {{ open: boolean, onClose: () => void, title: string, description?: string, children?: import('react').ReactNode,
 *           footer?: import('react').ReactNode, variant?: 'dialog' | 'sheet' }} props
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = 'dialog' }) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null))
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Esc fires 'cancel'; let the parent decide by routing it through onClose.
  const onCancel = (event) => {
    event.preventDefault()
    onClose()
  }
  // A click on the backdrop lands on the <dialog> element itself.
  const onClick = (event) => {
    if (event.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles[variant]}`} aria-labelledby={titleId} onCancel={onCancel} onClick={onClick}>
      {open && (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description && <p className={styles.description}>{description}</p>}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          {children && <div className={styles.body}>{children}</div>}
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

/** Right-side sheet, 440 px (SCREENS §0.3). */
export function Sheet(props) {
  return <Dialog {...props} variant="sheet" />
}
