import { useEffect } from 'react'

/**
 * Locks background scroll when `isLocked` is true.
 * Uses the `position: fixed` technique so it works reliably on iOS Safari
 * (where `overflow: hidden` on body is insufficient).
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'

    return () => {
      const y = parseInt(document.body.style.top || '0') * -1
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      window.scrollTo(0, y)
    }
  }, [isLocked])
}
