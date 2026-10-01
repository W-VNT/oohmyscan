/**
 * Point d'entree du pre-rendu de la landing (build uniquement).
 * Rend la page d'accueil en HTML statique pour que Google, Bing et les
 * robots des IA lisent le contenu sans executer le JavaScript.
 * Utilise par scripts/prerender-landing.mjs apres `vite build --ssr`.
 */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async'
import { LandingPage } from '@/pages/landing/LandingPage'

export function render(): { html: string; head: HelmetServerState | undefined } {
  const helmetContext: { helmet?: HelmetServerState } = {}
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location="/">
        <LandingPage />
      </StaticRouter>
    </HelmetProvider>,
  )
  return { html, head: helmetContext.helmet }
}
