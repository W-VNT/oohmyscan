// Injecte le HTML pre-rendu de la landing dans dist/index.html (route "/").
// dist/app.html reste une coquille vide pour toutes les autres routes.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ssrEntry = pathToFileURL(path.resolve('dist-ssr/entry-landing.js')).href
const { render } = await import(ssrEntry)
const { html } = render()

if (!html || html.length < 1000) {
  throw new Error(`[prerender] rendu suspect (${html?.length ?? 0} caracteres), build interrompu`)
}

// React 19 (react-helmet-async v3) emet les balises de metadonnees
// (title, meta, link, JSON-LD) en tete du HTML rendu au lieu du <head>.
// On les extrait pour les placer dans le <head> (une balise canonical dans
// le <body> est ignoree par Google).
const hoistRe = /^(?:\s*(?:<link\b[^>]*\/>|<meta\b[^>]*\/>|<title>[\s\S]*?<\/title>|<script type="application\/ld\+json">[\s\S]*?<\/script>))+/
const hoisted = html.match(hoistRe)?.[0] ?? ''
const body = html.slice(hoisted.length)

const indexPath = path.resolve('dist/index.html')
let index = fs.readFileSync(indexPath, 'utf8')
if (!index.includes('<div id="root"></div>')) {
  throw new Error('[prerender] <div id="root"></div> introuvable dans dist/index.html')
}

// Dedoublonnage : on retire du <head> d'origine les balises que la landing
// redefinit (titre, description, OpenGraph, Twitter...).
if (/<title>/.test(hoisted)) index = index.replace(/<title>[\s\S]*?<\/title>/, '')
for (const [, attr, key] of hoisted.matchAll(/<meta\s+(name|property)="([^"]+)"/g)) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  index = index.replace(new RegExp(`\\s*<meta\\s+${attr}="${escaped}"[^>]*>`, 'g'), '')
}

index = index
  .replace('</head>', `  ${hoisted}\n  </head>`)
  .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

fs.writeFileSync(indexPath, index)
fs.rmSync(path.resolve('dist-ssr'), { recursive: true, force: true })
console.log(`[prerender] landing pre-rendue : ${Math.round(body.length / 1024)} Ko de HTML, ${hoisted.length ? 'metadonnees placees dans le <head>' : 'aucune metadonnee a deplacer'}`)
