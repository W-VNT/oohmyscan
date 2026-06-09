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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
)
