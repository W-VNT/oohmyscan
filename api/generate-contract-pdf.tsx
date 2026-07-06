/**
 * Vercel Serverless Function — génération PDF contrat / avenant côté serveur.
 *
 * Pourquoi : @react-pdf/renderer + fonts + images bouffent 30-50 MB de RAM
 * pendant le rendu. Sur téléphones bas de gamme d'opérateurs terrain, ça
 * crashe avec "Mémoire insuffisante". En déplaçant côté serveur :
 *   - Le client n'importe plus ContractPDF/AmendmentPDF -> bundle -400 KB
 *   - Le rendu se fait sur Node.js Vercel où la RAM est confortable
 *   - Le client reste simple : POST data + reçoit path Storage
 *
 * Auth : Bearer JWT Supabase du user. On valide via service role côté serveur.
 * Storage : upload PDF via service role (bypass RLS pour fiabilité).
 *
 * Env vars Vercel requis :
 *   - VITE_SUPABASE_URL           (deja utilise en front)
 *   - SUPABASE_SERVICE_ROLE_KEY   (a ajouter)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { createElement } from 'react'
import { ContractPDF, type ContractPDFProps } from './pdf/ContractPDF.js'
import { AmendmentPDF, type AmendmentPDFProps } from './pdf/AmendmentPDF.js'

interface RequestBody {
  type: 'contract' | 'amendment'
  /** Chemin final du PDF dans le bucket panel-photos, ex "contracts/CONT-2026-0042.pdf". */
  fileName: string
  /** Props complètes à passer au composant. Les data URLs (logo + signatures)
   *  sont déjà côté client. */
  props: ContractPDFProps | AmendmentPDFProps
}

interface SuccessResponse {
  pdfPath: string
  size: number
}

interface ErrorResponse {
  error: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<VercelResponse> {
  // Try-catch global : capture aussi les exceptions synchrones (JSON.parse,
  // createClient sur URL malforme, etc.) qui sortiraient sinon en HTTP 500
  // generique sans message d'erreur exploitable cote client.
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' } satisfies ErrorResponse)
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[generate-contract-pdf] Missing env: VITE_SUPABASE_URL=', !!supabaseUrl, 'SUPABASE_SERVICE_ROLE_KEY=', !!serviceKey)
      return res.status(500).json({ error: 'Server misconfigured (missing env)' } satisfies ErrorResponse)
    }

    // Auth : Bearer JWT du user Supabase
    const authHeader = req.headers.authorization ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!jwt) {
      return res.status(401).json({ error: 'Missing bearer token' } satisfies ErrorResponse)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !userData.user) {
      console.error('[generate-contract-pdf] Auth failed:', authErr?.message)
      return res.status(401).json({ error: 'Invalid or expired token' } satisfies ErrorResponse)
    }

    const body = req.body as RequestBody | undefined
    if (!body || (body.type !== 'contract' && body.type !== 'amendment')) {
      return res.status(400).json({ error: 'Invalid payload : type must be contract|amendment' } satisfies ErrorResponse)
    }
    if (!body.fileName || !body.fileName.startsWith('contracts/') || !body.fileName.endsWith('.pdf')) {
      return res.status(400).json({ error: 'Invalid fileName' } satisfies ErrorResponse)
    }
    if (!body.props) {
      return res.status(400).json({ error: 'Missing props' } satisfies ErrorResponse)
    }

    try {
      // Rendu PDF
      const element = body.type === 'contract'
        ? createElement(ContractPDF, body.props as ContractPDFProps)
        : createElement(AmendmentPDF, body.props as AmendmentPDFProps)
      const buffer = await renderToBuffer(element)

      // Upload dans le bucket panel-photos (memes conventions que le front actuel).
      const { error: upErr } = await supabase.storage.from('panel-photos').upload(
        body.fileName,
        buffer,
        {
          contentType: 'application/pdf',
          upsert: true,
        },
      )
      if (upErr) {
        console.error('[generate-contract-pdf] Upload failed', upErr)
        return res.status(500).json({ error: `Upload failed: ${upErr.message}` } satisfies ErrorResponse)
      }

      return res.status(200).json({
        pdfPath: body.fileName,
        size: buffer.length,
      } satisfies SuccessResponse)
    } catch (e) {
      console.error('[generate-contract-pdf] Render failed', e)
      const msg = e instanceof Error ? `${e.message}\n${e.stack}` : 'Unknown error'
      return res.status(500).json({ error: `PDF gen failed: ${msg}` } satisfies ErrorResponse)
    }
  } catch (e) {
    console.error('[generate-contract-pdf] Fatal error', e)
    const msg = e instanceof Error ? `${e.message}` : 'Unknown fatal error'
    return res.status(500).json({ error: `Fatal: ${msg}` } satisfies ErrorResponse)
  }
}

// Force Node.js runtime (par defaut sur les fonctions .tsx, mais explicite pour lisibilite)
export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}
