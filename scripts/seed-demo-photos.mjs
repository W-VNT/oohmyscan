#!/usr/bin/env node
/**
 * Upload des photos placeholder sur les panneaux de la campagne demo.
 *
 * Prerequis :
 *  1. Avoir applique la migration et le seed `supabase/seeds/demo_reporting.sql`
 *  2. Avoir un .env.local avec :
 *       VITE_SUPABASE_URL=...
 *       SUPABASE_SERVICE_ROLE_KEY=...   (service role, PAS l'anon key)
 *
 * Usage :
 *   node scripts/seed-demo-photos.mjs
 *
 * Ce qui se passe :
 *  - Pour chaque panneau de la campagne "Demo Reporting Estival" :
 *      - Telecharge une photo random depuis picsum.photos
 *      - L'upload dans le bucket panel-photos a `<panel_id>/installation-<ts>.jpg`
 *      - Insere une ligne panel_photos avec photo_type='installation'
 *  - Idempotent : si une photo 'installation' existe deja pour le panneau, on skip.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Petit parser .env.local fait main (pas de dotenv en deps)
function loadEnv(file) {
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = { ...process.env, ...loadEnv(envPath) }
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const CAMPAIGN_ID = 'd0000000-0000-4000-8000-000000000002'

async function main() {
  console.log('Recuperation des panneaux de la campagne demo...')
  const { data: assignments, error } = await supabase
    .from('panel_campaigns')
    .select('panel_id, panels(id, reference, name)')
    .eq('campaign_id', CAMPAIGN_ID)

  if (error) {
    console.error('Erreur fetch panel_campaigns:', error)
    process.exit(1)
  }
  if (!assignments?.length) {
    console.error("Aucun panneau trouve. Lance d'abord le seed SQL.")
    process.exit(1)
  }
  console.log(`${assignments.length} panneaux a traiter\n`)

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const [idx, a] of assignments.entries()) {
    const panel = Array.isArray(a.panels) ? a.panels[0] : a.panels
    if (!panel) continue
    const panelLabel = `${panel.reference} (${panel.name})`

    // Skip si une photo installation existe deja
    const { count } = await supabase
      .from('panel_photos')
      .select('*', { count: 'exact', head: true })
      .eq('panel_id', panel.id)
      .eq('photo_type', 'installation')
    if ((count ?? 0) > 0) {
      console.log(`  [${idx + 1}/${assignments.length}] SKIP ${panelLabel} (deja une photo)`)
      skipped++
      continue
    }

    try {
      // Photo random : picsum.photos avec seed = panel.id pour reproductibilite
      const imgUrl = `https://picsum.photos/seed/${panel.id}/1200/900`
      const res = await fetch(imgUrl)
      if (!res.ok) throw new Error(`fetch picsum ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())

      const path = `${panel.id}/installation-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('panel-photos')
        .upload(path, buf, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr

      const { error: insErr } = await supabase.from('panel_photos').insert({
        panel_id: panel.id,
        storage_path: path,
        photo_type: 'installation',
        taken_at: new Date().toISOString(),
      })
      if (insErr) throw insErr

      console.log(`  [${idx + 1}/${assignments.length}] OK ${panelLabel}`)
      uploaded++
    } catch (e) {
      console.error(`  [${idx + 1}/${assignments.length}] ERR ${panelLabel} : ${e.message}`)
      errors++
    }
  }

  console.log(`\nFini : ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`)
  if (uploaded > 0) {
    console.log(
      `\nVa dans /admin/campaigns/${CAMPAIGN_ID} et clique "Generer rapport campagne"`,
    )
  }
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
