/**
 * Vercel Serverless Function — génération PDF contrat / avenant côté serveur.
 *
 * Compat CJS+ESM : Vercel compile ce .ts en .js et le charge par default
 * en CJS. Les modules ESM-only (@react-pdf/renderer + les templates
 * ContractPDF/AmendmentPDF qui en dependent) sont donc importes en
 * dynamique via await import() — ca marche depuis un fichier CJS.
 *
 * Env vars Vercel requis :
 *   - VITE_SUPABASE_URL           (deja utilise en front)
 *   - SUPABASE_SERVICE_ROLE_KEY   (a ajouter)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { ContractPDFProps } from './pdf/ContractPDF.js'
import type { AmendmentPDFProps } from './pdf/AmendmentPDF.js'
import { createClient } from '@supabase/supabase-js'

interface RequestBody {
  type: 'contract' | 'amendment'
  fileName: string
  props: ContractPDFProps | AmendmentPDFProps
}

/**
 * Cache module-level : les dynamic imports (react-pdf/renderer + templates)
 * coutent 2-4s au cold start. En stockant la promise ici, tous les warm hits
 * reutilisent le meme chargement -> 0ms de cout apres le 1er invoke du
 * container Vercel. Kick-off dès l'init du module (fire-and-forget) pour
 * profiter du temps de bootstrap Node.
 */
type PdfModules = {
  renderToBuffer: typeof import('@react-pdf/renderer').renderToBuffer
  createElement: typeof import('react').createElement
  ContractPDF: typeof import('./pdf/ContractPDF.js').ContractPDF
  AmendmentPDF: typeof import('./pdf/AmendmentPDF.js').AmendmentPDF
}

let pdfModulesPromise: Promise<PdfModules> | null = null
function loadPdfModules(): Promise<PdfModules> {
  if (!pdfModulesPromise) {
    pdfModulesPromise = Promise.all([
      import('@react-pdf/renderer'),
      import('react'),
      import('./pdf/ContractPDF.js'),
      import('./pdf/AmendmentPDF.js'),
    ]).then(([reactPdf, react, contractMod, amendmentMod]) => ({
      renderToBuffer: reactPdf.renderToBuffer,
      createElement: react.createElement,
      ContractPDF: contractMod.ContractPDF,
      AmendmentPDF: amendmentMod.AmendmentPDF,
    }))
  }
  return pdfModulesPromise
}

// Pre-warm : lance le chargement des ~la 1ere invocation du container.
// Aucun coût si le container n'est jamais utilisé; gain massif dès le 1er hit.
loadPdfModules().catch(() => {
  // Silent, sera reprise a la 1ere requete si echec
  pdfModulesPromise = null
})

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
      // Utilise le cache module-level : 0ms sur warm hits (grosse difference
      // avec les dynamic imports a chaque requete).
      const { renderToBuffer, createElement, ContractPDF, AmendmentPDF } = await loadPdfModules()

      const element = body.type === 'contract'
        ? createElement(ContractPDF, body.props as ContractPDFProps)
        : createElement(AmendmentPDF, body.props as AmendmentPDFProps)
      const buffer = await renderToBuffer(element)

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

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}
