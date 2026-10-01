import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// Build client : index.html (landing, pre-rendue ensuite) + app.html
// (coquille de l'app, generee par scripts/make-app-html.mjs). Build SSR :
// uniquement le rendu de la landing, sans PWA.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    tailwindcss(),
    !isSsrBuild && VitePWA({
      // autoUpdate : quand un nouveau deploiement arrive, le SW se met a jour
      // automatiquement et recharge la page au prochain focus. Evite le
      // pb "'text/html' is not a valid JavaScript MIME type" qui se produit
      // quand l'index.html cache reference des chunks JS qui n'existent plus.
      registerType: 'autoUpdate',
      // injectManifest : on ecrit notre propre SW (src/sw.ts) pour supporter
      // les push notifications (handlers push + notificationclick) en plus du
      // cache Workbox.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['images/supports/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'OOHMYSCAN',
        short_name: 'OOHMYSCAN',
        description: 'Application terrain pour la gestion de panneaux OOH',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/app',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // SSR : tout est embarque dans un seul fichier (evite les soucis
  // d'interop CJS/ESM de certaines dependances sous Node).
  ssr: { noExternal: true },
  build: isSsrBuild || !fs.existsSync(path.resolve(__dirname, 'app.html'))
    ? {}
    : {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            app: path.resolve(__dirname, 'app.html'),
          },
        },
      },
}))
