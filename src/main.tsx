import React from 'react'
import ReactDOM from 'react-dom/client'
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
    <App />
  </React.StrictMode>
)
