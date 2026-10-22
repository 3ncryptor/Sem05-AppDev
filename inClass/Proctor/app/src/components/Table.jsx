// A plain data table. Clickable rows are also reachable by keyboard (Tab, then Enter).
import styles from './Table.module.css'

/**
 * @template T
 * @param {{ caption: string, columns: { key: string, label: string, align?: 'left' | 'right', render?: (row: T) => import('react').ReactNode }[],
 *           rows: T[], rowKey: (row: T) => string, onRowClick?: (row: T) => void }} props
 */
export function Table({ caption, columns, rows, rowKey, onRowClick }) {
  const onKeyDown = (event, row) => {
    if (event.key === 'Enter') onRowClick(row)
  }
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.align === 'right' ? styles.right : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? styles.clickable : ''}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => onKeyDown(event, row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? styles.right : ''}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
