// Page header (DESIGN.md "Layout patterns"): optional breadcrumb, serif page title, one-line description,
// actions right-aligned on the title line, 32 px gap before the content. One per shell page.
//
// Props:
//   title        ReactNode   the page's single <h1>
//   description  ReactNode?  one line in --ink-soft
//   breadcrumb   ReactNode?  rendered above the title in --text-sm --ink-soft
//   actions      ReactNode?  buttons on the right of the title line (one primary at most)
//   meta         ReactNode?  inline items after the title (mono code, status chip)
//   className    string?
import styles from './PageHeader.module.css'

/**
 * @param {{ title: import('react').ReactNode, description?: import('react').ReactNode, breadcrumb?: import('react').ReactNode,
 *           actions?: import('react').ReactNode, meta?: import('react').ReactNode, className?: string }} props
 */
export function PageHeader({ title, description, breadcrumb, actions, meta, className = '' }) {
  return (
    <header className={`${styles.header} ${className}`}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{title}</h1>
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </header>
  )
}
