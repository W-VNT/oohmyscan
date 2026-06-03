import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const LANDING_FAVICON = {
  icon: '/favicon-landing-192.png',
  apple: '/apple-touch-icon-landing.png',
  title: 'OOH MY AD !',
}

const APP_FAVICON = {
  icon: '/logo.svg',
  apple: '/apple-touch-icon.png',
  title: 'OOHMYSCAN',
}

function isLandingRoute(pathname: string): boolean {
  if (pathname.startsWith('/login')) return false
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/app')) return false
  if (pathname.startsWith('/auth')) return false
  return true
}

function applyFavicon(landing: boolean) {
  const config = landing ? LANDING_FAVICON : APP_FAVICON

  // Update both icon links — type attribute is a hint, browser uses href
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((link) => {
    link.href = config.icon
  })

  const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (appleLink) appleLink.href = config.apple

  const appleTitle = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  )
  if (appleTitle) appleTitle.content = config.title
}

export function DynamicFavicon() {
  const { pathname } = useLocation()

  useEffect(() => {
    applyFavicon(isLandingRoute(pathname))
  }, [pathname])

  return null
}
