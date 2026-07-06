/**
 * Logique de save d'une installation, extraite en fonction pure pour être
 * réutilisable :
 *  - depuis InstallWizardPage (mode online direct)
 *  - depuis useOfflineSync au retour du réseau (replay de la queue IDB)
 *
 * Contient toute la logique : upload signatures, création/update panels,
 * insertion photos, génération PDF contrat/avenant, upload PDF, insertion
 * DB, envoi email au gérant.
 *
 * Idempotence : les panels sont matchés par qr_code (insert-or-update).
 * Le PDF est upload avec upsert:true. Les inserts contrat/avenant sont
 * catch-thrown si dupliqués (à améliorer avec une check upfront).
 */

import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { ContractPDF } from '@/lib/pdf/ContractPDF'
import { AmendmentPDF } from '@/lib/pdf/AmendmentPDF'
import { PANEL_ZONES } from '@/lib/constants'
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

async function fetchSignatureAsBase64(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('panel-photos').download(path)
  if (error || !data) throw new Error(`Impossible de charger ${path}`)
  const buf = await data.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return `data:image/png;base64,${btoa(binary)}`
}

async function generateAndUploadPDF(
  docNumber: string,
  element: React.ReactElement<DocumentProps>,
): Promise<{ path: string; blob: Blob }> {
  const blob = await pdf(element).toBlob()
  const path = `contracts/${docNumber}.pdf`
  const { error } = await supabase.storage.from('panel-photos').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error
  return { path, blob }
}

function getCompanyForPDF(settings: CompanyPublic | null | undefined) {
  if (!settings)
    return {
      name: 'OOHMYAD',
      address: null,
      city: null,
      postal_code: null,
      siret: null,
      phone: null,
      email: null,
      logoUrl: null,
    }
  const logoUrl = settings.logo_path
    ? supabase.storage.from('company-assets').getPublicUrl(settings.logo_path).data.publicUrl
    : null
  return {
    name: settings.company_name ?? 'OOHMYAD',
    address: settings.address ?? null,
    city: settings.city ?? null,
    postal_code: settings.postal_code ?? null,
    siret: settings.siret ?? null,
    phone: settings.phone ?? null,
    email: settings.email ?? null,
    logoUrl,
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

const CONTRACT_EMAIL_FALLBACK_SUBJECT =
  "Votre contrat d'installation {numero} — {entreprise}"
const CONTRACT_EMAIL_FALLBACK_BODY = `<p>Bonjour {gerant_prenom},</p><p>Vous trouverez ci-joint votre <strong>contrat d'autorisation d'installation N° {numero}</strong>, signé électroniquement.</p><p>L'équipe {entreprise}</p>`

async function sendContractEmail(params: {
  to: string
  contractNumber: string
  ownerFirstName: string
  ownerLastName: string
  establishmentName: string
  companyName: string
  subjectTemplate: string | null
  bodyTemplate: string | null
  pdfBlob: Blob
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const vars = {
      numero: params.contractNumber,
      gerant_prenom: params.ownerFirstName,
      gerant_nom: params.ownerLastName,
      etablissement: params.establishmentName,
      entreprise: params.companyName,
    }
    const subject = interpolate(
      params.subjectTemplate || CONTRACT_EMAIL_FALLBACK_SUBJECT,
      vars,
    )
    const html = interpolate(
      params.bodyTemplate || CONTRACT_EMAIL_FALLBACK_BODY,
      vars,
    )
    const pdfBase64 = await blobToBase64(params.pdfBlob)
    const { error } = await supabase.functions.invoke('send-document-email', {
      body: {
        to: params.to,
        subject,
        html,
        pdfBase64,
        pdfFilename: `contrat-${params.contractNumber}.pdf`,
        documentType: 'contract',
      },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
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
    supabase.from('company_public').select('*').limit(1).maybeSingle(),
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
  let sigOwnerPath: string
  let sigOperatorPath: string
  let sigOwnerForPdf: string
  let sigOperatorForPdf: string
  if (isAmendment && existingContract) {
    sigOwnerPath = existingContract.signature_owner
    sigOperatorPath = existingContract.signature_operator
    const [ownerB64, opB64] = await Promise.all([
      fetchSignatureAsBase64(sigOwnerPath),
      fetchSignatureAsBase64(sigOperatorPath),
    ])
    sigOwnerForPdf = ownerB64
    sigOperatorForPdf = opB64
  } else {
    const [oPath, pPath] = await Promise.all([
      uploadSignature(signOwner, 'owner'),
      uploadSignature(signOperator, 'operator'),
    ])
    sigOwnerPath = oPath
    sigOperatorPath = pPath
    sigOwnerForPdf = signOwner
    sigOperatorForPdf = signOperator
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

  // 4. Génération PDF contrat (ou avenant) + insertion DB + email
  const company = getCompanyForPDF(companySettings)
  const fullZoneLabels: Record<string, string> = Object.fromEntries(
    PANEL_ZONES.map((z) => [z.value, z.label]),
  )
  for (const p of panelsToCreate) {
    if (p.zone_label && p.zone_label.startsWith('custom:')) {
      fullZoneLabels[p.zone_label] = p.zone_label.slice(7)
    }
  }

  let contractNumber = ''
  let emailSent = false
  let emailError: string | null = null

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

    const { path: pdfPath } = await generateAndUploadPDF(
      amendmentNumber,
      <AmendmentPDF
        amendmentNumber={amendmentNumber}
        originalContractNumber={existingContract.contract_number}
        originalSignedAt={existingContract.signed_at}
        signedAt={now}
        signedCity={location.city}
        reason="panel_added"
        establishment={{
          name: location.name,
          address: location.address,
          postal_code: location.postal_code,
          city: location.city,
        }}
        owner={{
          first_name: location.owner_first_name,
          last_name: location.owner_last_name,
          role: location.owner_role,
        }}
        panelsAdded={panelsToCreate}
        panelsRemoved={[]}
        panelsAfter={allPanelsSnapshot}
        signatureOwner={sigOwnerForPdf}
        signatureOperator={sigOperatorForPdf}
        company={company}
        zoneLabels={fullZoneLabels}
      />,
    )

    const { error: insertErr } = await supabase.from('contract_amendments').insert({
      contract_id: existingContract.id,
      location_id: location.id,
      amendment_number: amendmentNumber,
      reason: 'panel_added',
      panels_added: panelsToCreate,
      panels_snapshot: allPanelsSnapshot,
      signature_owner: sigOwnerPath,
      signature_operator: sigOperatorPath,
      signed_at: now,
      storage_path: pdfPath,
      created_by: userId,
    })
    if (insertErr) throw insertErr

    await supabase.from('panel_contracts').update({ status: 'amended' }).eq('id', existingContract.id)
    contractNumber = amendmentNumber
  } else {
    // Nouveau contrat
    const { data: numData, error: rpcErr } = await supabase.rpc('get_next_contract_number')
    if (rpcErr) throw rpcErr
    contractNumber = numData as string

    const { path: pdfPath, blob: pdfBlob } = await generateAndUploadPDF(
      contractNumber,
      <ContractPDF
        contractNumber={contractNumber}
        signedAt={now}
        signedCity={location.city}
        establishment={{
          name: location.name,
          address: location.address,
          postal_code: location.postal_code,
          city: location.city,
          phone: location.phone,
        }}
        owner={{
          first_name: location.owner_first_name,
          last_name: location.owner_last_name,
          role: location.owner_role,
          email: location.owner_email,
        }}
        closingMonths={location.closing_months}
        panels={panelsToCreate}
        panelFormat={
          defaultPanelType
            ? {
                name: defaultPanelType.name,
                width_cm: defaultPanelType.width_cm,
                height_cm: defaultPanelType.height_cm,
              }
            : null
        }
        signatureOwner={sigOwnerForPdf}
        signatureOperator={sigOperatorForPdf}
        company={company}
        zoneLabels={fullZoneLabels}
      />,
    )

    const { error: insertErr } = await supabase.from('panel_contracts').insert({
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
      storage_path: pdfPath,
      created_by: userId,
    })
    if (insertErr) throw insertErr

    // Email au gerant (best-effort, ne bloque pas)
    if (location.owner_email) {
      const res = await sendContractEmail({
        to: location.owner_email,
        contractNumber,
        ownerFirstName: location.owner_first_name || '',
        ownerLastName: location.owner_last_name || '',
        establishmentName: location.name,
        companyName: company.name,
        subjectTemplate: companySettings?.email_contract_subject ?? null,
        bodyTemplate: companySettings?.email_contract_body ?? null,
        pdfBlob,
      })
      emailSent = res.ok
      emailError = res.error ?? null
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
 * Détecte si une erreur ressemble à un souci réseau (offline, DNS, timeout).
 * Utilisé côté wizard pour décider si on queue ou si on remonte l'erreur.
 */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /network|fetch|failed|typeerror|timeout/i.test(msg)
}
