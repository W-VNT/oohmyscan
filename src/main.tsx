// Capture auth callback markers AVANT que Supabase consomme l'URL.
// Supports les 2 flows : implicit (hash #access_token=...&type=invite) ET
// PKCE (query ?code=xxx, sans indication de type dans l'URL — on detecte
// alors via session.user.last_sign_in_at = null dans LoginPage).
const _hash = window.location.hash
const _search = window.location.search
if (_hash.includes('type=invite') || _search.includes('type=invite')) {
  sessionStorage.setItem('auth_callback_type', 'invite')
} else if (_hash.includes('type=recovery') || _search.includes('type=recovery')) {
  sessionStorage.setItem('auth_callback_type', 'recovery')
} else if (_search.includes('code=')) {
  // PKCE callback sans type explicite — on marque comme generique pour que
  // LoginPage attende le SIGNED_IN et decide selon le profil utilisateur.
  sessionStorage.setItem('auth_callback_type', 'pkce_callback')
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'

// Restore theme before first paint to avoid flash
const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
document.documentElement.classList.toggle('dark', isDark)
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0A0A0A' : '#FFFFFF')

// Quand un nouveau Service Worker prend le controle (via clients.claim() en SW),
// on force un reload complet de la page. Sinon le JS deja charge en memoire
// continue de tourner avec des references vers les anciens chunks (qui n'existent
// plus sur la nouvelle version), et l'utilisateur voit un mix ancien/nouveau
// avec crash au premier lazy-import.
// Guard sessionStorage : evite la boucle infinie de reload.
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    // Skip le premier controllerchange qui arrive au tout debut (SW s'installe
    // la premiere fois, aucun code cache n'est stale a ce moment-la).
    if (sessionStorage.getItem('sw_ever_controlled') !== '1') {
      sessionStorage.setItem('sw_ever_controlled', '1')
      return
    }
    reloading = true
    window.location.reload()
  })
  if (navigator.serviceWorker.controller) {
    sessionStorage.setItem('sw_ever_controlled', '1')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
)
