// Copy, cut, paste and the context menu are blocked in the exam when the clipboard rule says so (SCREENS C7),
// and each attempt is reported as `clipboard_attempt`. Typing in answer boxes still works; pasting doesn't.
import { useEffect } from 'react'
import { ipc } from '../../lib/api.js'

export function useClipboardBlock(rule, questionId) {
  const blockCopy = Boolean(rule?.on && rule.blockCopyPaste)
  const blockMenu = Boolean(rule?.on && rule.blockContextMenu)
  useEffect(() => {
    if (!blockCopy && !blockMenu) return undefined
    const report = (action) => ipc.examEvent({ type: 'clipboard_attempt', questionId, payload: { action } }).catch(() => null)
    const onClipboard = (event) => {
      event.preventDefault()
      report(event.type)
    }
    const onMenu = (event) => {
      event.preventDefault()
      report('contextmenu')
    }
    const types = blockCopy ? ['copy', 'cut', 'paste'] : []
    types.forEach((type) => document.addEventListener(type, onClipboard))
    if (blockMenu) document.addEventListener('contextmenu', onMenu)
    return () => {
      types.forEach((type) => document.removeEventListener(type, onClipboard))
      document.removeEventListener('contextmenu', onMenu)
    }
  }, [blockCopy, blockMenu, questionId])
}
