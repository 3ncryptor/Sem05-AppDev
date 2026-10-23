// Exam keys (SCREENS C7): 1–9 choose · N next · P previous · M mark · Q palette · Esc closes the palette.
// Letter keys are off while a text or number box has focus; Esc leaves the box and turns them back on.
import { useEffect } from 'react'

const isTyping = (target) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** @param {{ enabled: boolean, onDigit: (n: number) => void, onNext: () => void, onPrevious: () => void,
 *           onMark: () => void, onPalette: () => void, onEscape: () => void }} handlers */
export function useShortcuts(handlers) {
  useEffect(() => {
    if (!handlers.enabled) return undefined
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) {
        if (event.key === 'Escape') event.target.blur()
        return
      }
      const key = event.key.toLowerCase()
      if (/^[1-9]$/.test(key)) handlers.onDigit(Number(key))
      else if (key === 'n') handlers.onNext()
      else if (key === 'p') handlers.onPrevious()
      else if (key === 'm') handlers.onMark()
      else if (key === 'q') handlers.onPalette()
      else if (key === 'escape') handlers.onEscape()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
