/**
 * Logique de save d'une installation, extraite en fonction pure pour être
 * réutilisable :
 *  - depuis InstallWizardPage (mode online direct)
 *  - depuis useOfflineSync au retour du réseau (replay de la queue IDB)
 *
 * Contient toute la logique : upload signatures, création/update panels,
 * insertion photos, insertion DB contrat/avenant, invocation de l'edge fn
 * generate-contract-pdf (juillet 2026), envoi email au gérant.
 *
 * Idempotence : les panels sont matchés par qr_code (insert-or-update).
 * Le PDF est upload cote serveur avec upsert:true. Les inserts contrat/
 * avenant sont catch-thrown si dupliqués.
 */

import { supabase } from '@/lib/supabase'
import { PANEL_ZONES } from '@/lib/constants'
import { logError } from '@/lib/error-logger'
import type { Location } from '@/types'
import type { InstalledPanelData } from '@/lib/offline-mutation-queue'
import type { CompanyPublic } from '@/hooks/useCompanyPublic'

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

export interface InstallSaveInput {
  location: Location
  installed: InstalledPanelData[]
  signOwner: string
  signOperator: string
  plannedPanelsCount?: number
  isAmendment: boolean
  userId: string
  lat?: number
  lng?: number
}

export interface InstallSaveResult {
  contractNumber: string
  firstPanelId: string | null
  emailSent: boolean
  emailError: string | null
}

// ============================================================================
// Helpers
// ============================================================================

function zoneLabel(zone: string): string {
  if (zone.startsWith('custom:')) return zone.slice(7)
  const z = PANEL_ZONES.find((x) => x.value === zone)
  return z?.label ?? zone
}

async function uploadSignature(dataUrl: string, prefix: string): Promise<string> {
  const base64 = dataUrl.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'image/png' })
  const path = `signatures/${prefix}-${crypto.randomUUID()}.png`
  const { error } = await supabase.storage.from('panel-photos').upload(path, blob, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) throw error
  return path
}

interface PdfEmailPayload {
  to: string
  ownerFirstName: string
  ownerLastName: string
  establishmentName: string
  companyName: string
  subjectTemplate: string | null
  bodyTemplate: string | null
}

/**
 * Invoke l'edge fn generate-contract-pdf en fire-and-forget. L'edge fn gere
 * le rendu PDF + upload + UPDATE storage_path + envoi email (si payload).
 * Best-effort : les erreurs sont logguees, ne bloquent pas le succes du save.
 */
function invokePdfGen(
  docId: string,
  type: 'contract' | 'amendment',
  email?: PdfEmailPayload,
): void {
  supabase.functions
    .invoke('generate-contract-pdf', {
      body: { contractId: docId, type, email },
    })
    .then(({ data, error }) => {
      if (error) {
        console.error('[install-replay] PDF gen edge fn failed:', error)
        void logError('offline_replay', 'invoke_pdf_gen', error, { doc_id: docId, type })
        return
      }
      const emailSent = (data as { emailSent?: boolean })?.emailSent
      const emailError = (data as { emailError?: string })?.emailError
      if (email && emailSent === false) {
        console.warn('[install-replay] Email non envoye :', emailError)
        void logError('offline_replay', 'email_send', new Error(emailError ?? 'unknown'), { doc_id: docId, type, to: email.to })
      }
    })
    .catch((e) => {
      console.error('[install-replay] PDF gen invoke threw:', e)
      void logError('offline_replay', 'invoke_pdf_gen_throw', e, { doc_id: docId, type })
    })
}

// ============================================================================
// Main : replay ou save direct
// ============================================================================

export async function performInstallSave(
  input: InstallSaveInput,
): Promise<InstallSaveResult> {
  const { location, installed, signOwner, signOperator, isAmendment, userId } = input

  if (installed.length === 0) throw new Error('Aucun panneau installé')

  // 1. Fetch companySettings + defaultPanelType + existingContract au replay time
  //    (utilise les infos actuelles, pas un snapshot périmé)
  const [settingsRes, panelTypesRes, existingContractRes] = await Promise.all([
    supabase.rpc('get_company_public').maybeSingle(),
    supabase.from('panel_formats').select('*').eq('is_active', true),
    isAmendment
      ? supabase
          .from('panel_contracts')
          .select('*')
          .eq('location_id', location.id)
          .neq('status', 'terminated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  const companySettings = settingsRes.data as CompanyPublic | null
  const panelTypes = panelTypesRes.data ?? []
  const existingContract = existingContractRes.data as {
    id: string
    contract_number: string
    signature_owner: string
    signature_operator: string
    signed_at: string
  } | null

  const defaultPanelType =
    companySettings?.default_panel_type_id && panelTypes.length > 0
      ? panelTypes.find((t) => t.id === companySettings.default_panel_type_id) ?? null
      : null

  // 2. Résolution des signatures :
  //    - Nouveau contrat : upload les base64
  //    - Amendement : réutilise les signatures du contrat original
  //    On ne garde que les paths storage : le rendu PDF est cote serveur.
  let sigOwnerPath: string
  let sigOperatorPath: string
  if (isAmendment && existingContract) {
    sigOwnerPath = existingContract.signature_owner
    sigOperatorPath = existingContract.signature_operator
  } else {
    const [oPath, pPath] = await Promise.all([
      uploadSignature(signOwner, 'owner'),
      uploadSignature(signOperator, 'operator'),
    ])
    sigOwnerPath = oPath
    sigOperatorPath = pPath
  }

  // 3. Insertion / update des panels par qr_code (idempotent).
  //    Nouveau flow (juillet 2026) : plus de photo/zone captures pendant l'install.
  //    Les items en queue avant cette date peuvent encore avoir photoPath+zone : on
  //    les traite normalement en backward-compat.
  const now = new Date().toISOString()
  const panelsToCreate: PanelSnapshot[] = []
  for (const p of installed) {
    const zoneName = p.zone ? zoneLabel(p.zone) : ''
    const autoName = location.name + (zoneName ? ` — ${zoneName}` : '')
    const reference = `PAN-${Date.now().toString(36).toUpperCase()}`

    const { data: existing } = await supabase
      .from('panels')
      .select('id')
      .eq('qr_code', p.qrCode)
      .maybeSingle()

    let realPanelId: string
    if (existing) {
      const { error: updErr } = await supabase
        .from('panels')
        .update({
          location_id: location.id,
          zone_label: p.zone ?? null,
          name: autoName,
          address: location.address,
          city: location.city,
          type: defaultPanelType?.name ?? null,
          status: 'active',
          installed_at: now,
          installed_by: userId,
          updated_at: now,
        })
        .eq('id', existing.id)
      if (updErr) throw updErr
      realPanelId = existing.id
    } else {
      const { data: created, error: insErr } = await supabase
        .from('panels')
        .insert({
          qr_code: p.qrCode,
          reference,
          name: autoName,
          address: location.address,
          city: location.city,
          lat: input.lat ?? 0,
          lng: input.lng ?? 0,
          location_id: location.id,
          zone_label: p.zone ?? null,
          type: defaultPanelType?.name ?? null,
          status: 'active',
          installed_at: now,
          installed_by: userId,
          last_checked_at: now,
        })
        .select('id')
        .single()
      if (insErr) throw insErr
      realPanelId = created.id
    }

    // Insert photo (skip si nouveau flow qui n'en capture pas)
    if (p.photoPath) {
      const { error: photoErr } = await supabase.from('panel_photos').insert({
        panel_id: realPanelId,
        storage_path: p.photoPath,
        photo_type: 'installation',
        taken_at: now,
        taken_by: userId,
      })
      if (photoErr) throw photoErr
    }

    panelsToCreate.push({
      panel_id: realPanelId,
      zone_label: p.zone ?? '',
      qr_code: p.qrCode,
      reference: existing ? p.reference : reference,
    })
  }

  // 4. Insertion DB contrat/avenant + generation PDF cote serveur.
  //    Envoi email desactive : admin l'envoie manuellement depuis la fiche.
  let contractNumber = ''
  const emailSent = false
  const emailError: string | null = null

  if (isAmendment && existingContract) {
    // Amendement
    const { data: numData, error: rpcErr } = await supabase.rpc('get_next_amendment_number', {
      p_contract_id: existingContract.id,
    })
    if (rpcErr) throw rpcErr
    const amendmentNumber = numData as string

    const { data: existingPanels } = await supabase
      .from('panels')
      .select('id, qr_code, reference, zone_label')
      .eq('location_id', location.id)
    const allPanelsSnapshot: PanelSnapshot[] = (existingPanels ?? []).map((p) => ({
      panel_id: p.id,
      zone_label: p.zone_label ?? '',
      qr_code: p.qr_code,
      reference: p.reference,
    }))

    const { data: amendment, error: insertErr } = await supabase.from('contract_amendments').insert({
      contract_id: existingContract.id,
      location_id: location.id,
      amendment_number: amendmentNumber,
      reason: 'panel_added',
      panels_added: panelsToCreate,
      panels_snapshot: allPanelsSnapshot,
      signature_owner: sigOwnerPath,
      signature_operator: sigOperatorPath,
      signed_at: now,
      storage_path: null,
      created_by: userId,
    }).select('id').single()
    if (insertErr) throw insertErr

    await supabase.from('panel_contracts').update({ status: 'amended' }).eq('id', existingContract.id)

    // PDF cote serveur en fire-and-forget (pas d'email pour un avenant)
    invokePdfGen(amendment.id, 'amendment')
    contractNumber = amendmentNumber
  } else {
    // Nouveau contrat
    const { data: numData, error: rpcErr } = await supabase.rpc('get_next_contract_number')
    if (rpcErr) throw rpcErr
    contractNumber = numData as string

    const { data: contract, error: insertErr } = await supabase.from('panel_contracts').insert({
      location_id: location.id,
      contract_number: contractNumber,
      establishment_name: location.name,
      establishment_address: location.address,
      establishment_postal_code: location.postal_code,
      establishment_city: location.city,
      establishment_phone: location.phone,
      owner_last_name: location.owner_last_name,
      owner_first_name: location.owner_first_name,
      owner_role: location.owner_role,
      owner_email: location.owner_email,
      closing_months: location.closing_months,
      panels_snapshot: panelsToCreate,
      signature_owner: sigOwnerPath,
      signature_operator: sigOperatorPath,
      signed_at: now,
      storage_path: null,
      created_by: userId,
    }).select('id').single()
    if (insertErr) throw insertErr

    // PDF cote serveur en fire-and-forget. Envoi email desactive : l'admin
    // l'envoie manuellement depuis la fiche lieu apres verification.
    invokePdfGen(contract.id, 'contract')
  }

  // 5. Assignations de campagne inline (diffusion "maintenant" pendant le
  //    wizard install). On mappe qrCode → panel_id creee ci-dessus pour
  //    router les inserts panel_campaigns. Best-effort : les erreurs sont
  //    loggees mais ne bloquent pas le succes du save.
  const panelIdByQrCode = new Map<string, string>()
  for (let i = 0; i < installed.length; i++) {
    panelIdByQrCode.set(installed[i].qrCode, panelsToCreate[i].panel_id)
  }
  for (const p of installed) {
    if (!p.pendingAssign) continue
    const realPanelId = panelIdByQrCode.get(p.qrCode)
    if (!realPanelId) continue
    try {
      await supabase.from('panel_campaigns').insert({
        panel_id: realPanelId,
        campaign_id: p.pendingAssign.campaignId,
        assigned_by: userId,
        validation_photo_path: p.pendingAssign.photoPath,
        validated_at: now,
      })
      await supabase.from('panel_photos').insert({
        panel_id: realPanelId,
        storage_path: p.pendingAssign.photoPath,
        photo_type: 'campaign',
        taken_by: userId,
        taken_at: now,
      })
      await supabase
        .from('panels')
        .update({
          status: 'active',
          last_checked_at: now,
          updated_at: now,
        })
        .eq('id', realPanelId)
    } catch (e) {
      console.warn('[install-replay] Diffusion inline failed for', p.qrCode, e)
      void logError('offline_replay', 'diffuse_inline', e, {
        qr_code: p.qrCode,
        panel_id: realPanelId,
      })
    }
  }

  return {
    contractNumber,
    firstPanelId: panelsToCreate[0]?.panel_id ?? null,
    emailSent,
    emailError,
  }
}

/**
 * Détecte si une erreur ressemble à un souci réseau (offline, DNS, timeout,
 * upload storage interrompu). Utilisé côté wizard pour décider si on queue
 * la mutation en offline ou si on remonte l'erreur brute.
 *
 * Cas couverts :
 *   - navigator.onLine = false (offline explicite)
 *   - err.message contient network|fetch|failed|typeerror|timeout
 *   - err.name est une des classes d'erreur reseau connues de supabase-js
 *     (StorageUnknownError, StorageApiError, AuthRetryableFetchError)
 *   - err.name est TypeError (fetch echoue en TypeError sur Safari iOS)
 */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  const name = err instanceof Error ? err.name : ''
  if (/^(TypeError|StorageUnknownError|StorageApiError|AuthRetryableFetchError|NetworkError)$/i.test(name)) {
    return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return /network|fetch|failed|typeerror|timeout|load failed/i.test(msg)
}
