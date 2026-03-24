import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from './useHotkeys'

/**
 * Page-level hotkeys for list pages.
 * - C / N: navigate to create page
 * - /: focus search input
 */
export function useListPageHotkeys(createPath: string) {
  const navigate = useNavigate()

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="text"], input[placeholder*="echerch"]')
    if (input) {
      input.focus()
      input.select()
    }
  }, [])

  useHotkeys({
    c: () => navigate(createPath),
    n: () => navigate(createPath),
    '/': focusSearch,
  })
}

/**
 * Page-level hotkeys for detail pages.
 * Pass action callbacks as needed.
 */
export function useDetailPageHotkeys(actions: {
  onSend?: () => void
  onDuplicate?: () => void
  onPreviewPdf?: () => void
  onSave?: () => void
}) {
  useHotkeys({
    e: () => actions.onSend?.(),
    d: () => actions.onDuplicate?.(),
    p: () => actions.onPreviewPdf?.(),
    s: () => actions.onSave?.(),
  })
}
