/**
 * Client-side helper pour appeler l'API `/api/generate-contract-pdf` qui
 * genere le PDF cote serveur au lieu du client (evite les OOM sur mobiles
 * bas de gamme).
 *
 * Le composant PDF (ContractPDF/AmendmentPDF) n'est plus importe du tout
 * cote client : ce module ne fait que du POST. Cela permet le tree-shaking
 * complet de @react-pdf/renderer du bundle main (~400 KB gagnes).
 */

import { supabase } from '@/lib/supabase'

interface GeneratePDFOptions {
  type: 'contract' | 'amendment'
  /** Chemin cible dans le bucket panel-photos, ex "contracts/CONT-2026-0042.pdf". */
  fileName: string
  /** Props complets ContractPDFProps | AmendmentPDFProps.
   *  Contient les data URLs pour logo + signatures. */
  props: unknown
}

interface GeneratePDFResult {
  pdfPath: string
  size: number
}

/**
 * Envoie les props au serveur pour rendu PDF + upload dans le Storage.
 * Retourne le chemin final du PDF dans le bucket panel-photos.
 *
 * @throws Error si l'API renvoie une erreur ou le fetch echoue.
 */
export async function generateContractPDFServer(
  options: GeneratePDFOptions,
): Promise<GeneratePDFResult> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || !sessionData.session?.access_token) {
    throw new Error('Session Supabase invalide (utilisateur non authentifie)')
  }

  const response = await fetch('/api/generate-contract-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const errBody = await response.json()
      if (errBody && typeof errBody.error === 'string') errorMsg = errBody.error
    } catch {
      // ignore JSON parse error
    }
    throw new Error(`Generation PDF echouee : ${errorMsg}`)
  }

  const body = (await response.json()) as GeneratePDFResult
  if (!body.pdfPath) throw new Error('Reponse serveur invalide (pdfPath manquant)')
  return body
}

/**
 * Recupere un PDF genere par le serveur sous forme de Blob, pour l'envoyer
 * en piece jointe email via l'edge function send-document-email.
 *
 * Utilise le Storage Supabase — le user a acces au bucket panel-photos via
 * son JWT (RLS applique).
 */
export async function downloadPDFBlob(pdfPath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from('panel-photos').download(pdfPath)
  if (error || !data) throw new Error(`Download PDF echoue : ${error?.message ?? 'blob null'}`)
  return data
}
