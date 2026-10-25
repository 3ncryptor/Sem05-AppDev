// Copy, cut, paste and the context menu are blocked in the exam when the clipboard rule says so (SCREENS C7),
// Nothing is reported or flagged. Typing in answer boxes still works; pasting doesn't.
import { useEffect } from 'react'

export function useClipboardBlock(rule) {
  const blockCopy = Boolean(rule?.on && rule.blockCopyPaste)
  const blockMenu = Boolean(rule?.on && rule.blockContextMenu)
  useEffect(() => {
    if (!blockCopy && !blockMenu) return undefined
    const block = (event) => event.preventDefault()
    const types = blockCopy ? ['copy', 'cut', 'paste'] : []
    types.forEach((type) => document.addEventListener(type, block))
    if (blockMenu) document.addEventListener('contextmenu', block)
    return () => {
      types.forEach((type) => document.removeEventListener(type, block))
      document.removeEventListener('contextmenu', block)
    }
  }, [blockCopy, blockMenu])
}
