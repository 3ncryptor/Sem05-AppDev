import styles from './Card.module.css'

/** @param {{ as?: import('react').ElementType, padded?: boolean } & import('react').HTMLAttributes<HTMLElement>} props */
export function Card({ as: Tag = 'section', padded = true, className = '', children, ...rest }) {
  return (
    <Tag className={`${styles.card} ${padded ? styles.padded : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
