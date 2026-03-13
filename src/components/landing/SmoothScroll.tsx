import { useEffect } from 'react'
import Lenis from 'lenis'

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Handle anchor clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('#') || href.length > 50) return
      const el = document.querySelector(href)
      if (el) {
        e.preventDefault()
        lenis.scrollTo(el as HTMLElement, { offset: -80 })
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      lenis.destroy()
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return <>{children}</>
}
