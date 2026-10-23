// Question and option text with code (BUILD_PLAN §5.4): ```fenced blocks``` become an SF Mono block on a
// sunk surface that scrolls sideways and never wraps; `inline code` becomes <code>. No highlighting library.
import { Fragment } from 'react'
import styles from './Question.module.css'

const FENCE = /```[\w-]*\n?([\s\S]*?)```/g

/** Splits text into [{ kind: 'text' | 'code', value }]. */
function splitFences(text) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(FENCE)) {
    if (match.index > last) parts.push({ kind: 'text', value: text.slice(last, match.index) })
    parts.push({ kind: 'code', value: match[1].replace(/\n$/, '') })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

function InlineText({ value }) {
  const pieces = value.split(/(`[^`\n]+`)/g)
  return pieces.map((piece, index) =>
    piece.startsWith('`') && piece.endsWith('`') && piece.length > 2 ? (
      <code key={index} className={styles.inlineCode}>
        {piece.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={index}>{piece}</Fragment>
    ),
  )
}

/** @param {{ text: string, as?: 'div' | 'span' }} props */
export function CodeText({ text, as: Tag = 'div' }) {
  const parts = splitFences(String(text ?? ''))
  return (
    <Tag className={styles.codeText}>
      {parts.map((part, index) =>
        part.kind === 'code' ? (
          <pre key={index} className={styles.codeBlock} tabIndex={0}>
            <code>{part.value}</code>
          </pre>
        ) : (
          <span key={index} className={styles.prose}>
            <InlineText value={part.value.trim() ? part.value.replace(/^\n+|\n+$/g, '') : ''} />
          </span>
        ),
      )}
    </Tag>
  )
}
