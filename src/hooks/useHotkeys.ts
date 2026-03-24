import { useEffect, useCallback } from 'react'

type HotkeyMap = Record<string, () => void>

/**
 * Global keyboard shortcuts.
 * Keys are single lowercase letters (e.g. 'c', 'n', 'e') or special keys ('Escape', '/', '?').
 * Shortcuts are disabled when an input, textarea, select, or contenteditable is focused.
 */
export function useHotkeys(hotkeys: HotkeyMap) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Skip if modifier keys are pressed (except Shift for ?)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Skip if focused on an input element
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (target.isContentEditable) return

      const key = e.key
      const fn = hotkeys[key] || hotkeys[key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        fn()
      }
    },
    [hotkeys],
  )

  useEffect(() => {
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handler])
}
