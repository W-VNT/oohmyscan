import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function isLandingRoute(pathname: string): boolean {
  if (pathname.startsWith('/login')) return false
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/app')) return false
  if (pathname.startsWith('/auth')) return false
  return true
}

function computeIsDark(landing: boolean): boolean {
  if (landing) {
    // Landing publique : suit toujours la préférence OS
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  // App (login/admin/operator) : suit la préférence utilisateur (toggle dans le profil)
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return true
  if (saved === 'light') return false
  // 'system' ou absent → fallback OS
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? '#0A0A0A' : '#FFFFFF')
}

export function DynamicTheme() {
  const { pathname } = useLocation()

  useEffect(() => {
    const landing = isLandingRoute(pathname)
    applyTheme(computeIsDark(landing))

    // Réagit aux changements de préférence OS (live) — utile sur landing
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(computeIsDark(isLandingRoute(window.location.pathname)))
    media.addEventListener('change', handler)

    return () => media.removeEventListener('change', handler)
  }, [pathname])

  return null
}
