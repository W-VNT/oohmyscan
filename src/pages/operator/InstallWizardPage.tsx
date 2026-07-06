/**
 * Wizard unifie d'installation panneau + contrat.
 *
 * Flow rapide terrain (juillet 2026, simplifié suite retour operateurs) :
 *  1. Etablissement (selection ou creation)
 *  2. Scan panneau × N (loop rapide, sans photo/zone)
 *  3. Signature bailleur
 *  4. Signature operateur → save + PDF
 *
 * Photo/zone sont supprimes du flow install : ils seront captures plus tard
 * pendant les visites terrain de type "verifier" quand le visuel est en place.
 *
 * Optimise pour un opérateur sur le terrain : zero vocabulaire metier,
 * boutons grand format, 1 question / ecran, GPS auto.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Plus, Camera, Check, Building2, ChevronRight, FileCheck, Megaphone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { SignatureCanvas } from '@/components/contract/SignatureCanvas'
import { toast } from '@/components/shared/Toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/hooks/useAuth'
import { usePanelByQrCode } from '@/hooks/usePanels'
import { nearbyPlaces, searchPlaces, type PlaceSuggestion } from '@/lib/google-places'
import { reverseGeocodeAddress } from '@/lib/mapbox'
import { useSearchLocations, useLocationContract } from '@/hooks/useLocations'
import { useCompanyPublic } from '@/hooks/useCompanyPublic'
import { useActivePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useActiveCampaigns } from '@/hooks/useCampaigns'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'
import { downscaleImage } from '@/lib/image-utils'
import { generateContractPDFServer, downloadPDFBlob } from '@/lib/pdf-server'
import { enqueueInstall } from '@/lib/offline-mutation-queue'
import { isNetworkError } from '@/lib/install-replay'
import type { Location } from '@/types'

// ============================================================================
// Types
// ============================================================================

type Step =
  | 'location'
  | 'create_location'
  | 'diffuse_choice'    // Après scan : "Diffuser maintenant ?"
  | 'diffuse_campaign'  // Choix de la campagne
  | 'diffuse_photo'     // Photo du visuel posé
  | 'another'
  | 'sign_owner'
  | 'sign_operator'
  | 'saving'
  | 'success'

interface InstalledPanel {
  panelId: string
  qrCode: string
  reference: string
  /** Diffusion inline choisie sur le terrain — applique au save final. */
  pendingAssign?: {
    campaignId: string
    campaignName: string  // pour affichage recap
    photoPath: string
  }
}

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

// ============================================================================
// Multi-panel session : persiste le wizard a travers une navigation /app/scan
// ============================================================================
const SESSION_KEY = 'install_wizard_session'
const SESSION_TTL_MS = 60 * 60 * 1000 // 1h

interface PersistedSession {
  location: Location
  installed: InstalledPanel[]
  /** Signatures base64, si l'operateur a deja signe (rare : signatures sont a la fin). */
  signOwner?: string
  signOperator?: string
  ts: number
}

function saveSession(
  location: Location,
  installed: InstalledPanel[],
  extras?: { signOwner?: string; signOperator?: string },
) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      location,
      installed,
      ...(extras ?? {}),
      ts: Date.now(),
    } satisfies PersistedSession),
  )
}

function loadSession(): PersistedSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as PersistedSession
    if (Date.now() - data.ts > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ============================================================================
// Page
// ============================================================================

export function InstallWizardPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { lat, lng, requestPosition } = useGeolocation()
  const { data: companySettings } = useCompanyPublic()
  const { data: panelTypes } = useActivePanelTypes()

  // Continuation d'une session multi-panneaux ?
  const continueFromSession = searchParams.get('continue') === '1'

  // panelId est optionnel : on peut demarrer le wizard sans QR (nouveau flow).
  // On valide seulement s'il est present dans l'URL.
  if (panelId !== undefined && !isValidUUID(panelId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Identifiant de panneau invalide</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary underline">Retour</button>
      </div>
    )
  }

  // ============== State ==============
  const [step, setStep] = useState<Step>('location')
  const [location, setLocation] = useState<Location | null>(null)
  const [newLocationData, setNewLocationData] = useState({
    name: '',
    phone: '',
    owner_email: '',
    owner_first_name: '',
    owner_last_name: '',
    address: '',
    postal_code: '',
    city: '',
  })
  const [installed, setInstalled] = useState<InstalledPanel[]>([])
  const [signOwner, setSignOwner] = useState('')
  const [signOperator, setSignOperator] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedContractNumber, setSavedContractNumber] = useState<string | null>(null)
  const [savedFirstPanelId, setSavedFirstPanelId] = useState<string | null>(null)
  /** Campagne selectionnee au step 'diffuse_campaign', consommee au step 'diffuse_photo'. */
  const [diffuseCampaignId, setDiffuseCampaignId] = useState<string | null>(null)

  // ============== Campagnes actives assignees a l'operateur ==============
  const { data: activeCampaigns = [] } = useActiveCampaigns(session?.user?.id)

  // ============== GPS init ==============
  useEffect(() => { requestPosition() }, [requestPosition])

  // ============== Restore session multi-panneau (continuation) ==============
  // Si on arrive avec ?continue=1, on restaure le wizard de la session precedente
  // et on ajoute le panneau qui vient d'etre scanne (URL panelId) a la liste
  // installed[], puis on propose la diffusion inline via 'diffuse_choice'.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || !continueFromSession) return
    const persisted = loadSession()
    if (!persisted) return
    restoredRef.current = true
    setLocation(persisted.location)
    if (persisted.signOwner) setSignOwner(persisted.signOwner)
    if (persisted.signOperator) setSignOperator(persisted.signOperator)
    // Ajoute le panneau tout juste scanne (URL) a la liste. Guard contre les
    // doubles si l'user re-navigate avec le meme panelId.
    const alreadyIn = panelId ? persisted.installed.some((p) => p.qrCode === panelId) : true
    const justAdded = !alreadyIn && !!panelId
    const newInstalled = justAdded
      ? [...persisted.installed, { panelId: panelId!, qrCode: panelId!, reference: '' }]
      : persisted.installed
    setInstalled(newInstalled)
    // Panneau tout juste ajoute -> demande diffusion. Sinon recap.
    setStep(justAdded ? 'diffuse_choice' : 'another')
  }, [continueFromSession, panelId])

  // ============== Detect existing contract for amendment ==============
  const { data: existingContract, isLoading: contractLoading } = useLocationContract(location?.id)
  const isAmendment = !!existingContract

  // ============== Default panel type ==============
  const defaultPanelType = useMemo(() => {
    if (!companySettings?.default_panel_type_id || !panelTypes) return null
    return panelTypes.find((t) => t.id === companySettings.default_panel_type_id) ?? null
  }, [companySettings, panelTypes])

  // Scroll top on step change
  useEffect(() => { window.scrollTo(0, 0) }, [step])

  // ============== Render header (back + progress) ==============
  function header(title: string, subtitle?: string, onBack?: () => void) {
    return (
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    )
  }

  // ============================================================================
  // Passage a l'etape scan : sauve la session (avec sigs eventuelles) + navigate
  // ============================================================================
  function handleGoToScan() {
    if (!location) return
    setError(null)
    saveSession(location, installed, {
      signOwner: signOwner || undefined,
      signOperator: signOperator || undefined,
    })
    navigate('/app/scan?install_session=1')
  }

  // ============================================================================
  // Save : creation des panneaux + contrat
  // Cas amendement : on reutilise les signatures du contrat original (pas de
  // nouvelle signature demandee dans le nouveau flow).
  // ============================================================================
  async function handleFinalSave() {
    if (!location || !session?.user?.id) {
      setError('Donnees incompletes')
      return
    }
    if (installed.length === 0) {
      setError('Aucun panneau installe')
      return
    }
    if (!isAmendment && (!signOwner || !signOperator)) {
      setError('Signatures manquantes')
      return
    }
    setStep('saving')
    setError(null)

    // Payload commun (utilise online ou queue offline). Pas de photo/zone
    // dans le nouveau flow — ils seront ajoutes plus tard via les visites
    // "verifier" quand le visuel est en place.
    // pendingAssign : diffusion inline (campagne + photo visuel) posee
    // pendant le wizard, appliquee au save par install-replay.
    const savePayload = {
      location,
      installed: installed.map((p) => ({
        panelId: p.panelId,
        qrCode: p.qrCode,
        reference: p.reference,
        pendingAssign: p.pendingAssign
          ? {
              campaignId: p.pendingAssign.campaignId,
              photoPath: p.pendingAssign.photoPath,
            }
          : undefined,
      })),
      signOwner,
      signOperator,
      isAmendment,
      userId: session.user.id,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
    }

    // Si hors ligne : queue direct la mutation pour replay au retour reseau
    if (!navigator.onLine) {
      try {
        await enqueueInstall(savePayload)
        clearSession()
        setSavedContractNumber('en attente')
        setSavedFirstPanelId(installed[0]?.panelId ?? null)
        setStep('success')
        toast('Enregistré hors ligne — sync automatique dès reconnexion')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de sauvegarder localement')
        setStep('another')
      }
      return
    }

    try {
      // 1. Upload signatures OU reutilise celles du contrat existant (amendement)
      let sigOwnerPath: string
      let sigOperatorPath: string
      let sigOwnerForPdf: string
      let sigOperatorForPdf: string
      if (isAmendment && existingContract) {
        sigOwnerPath = existingContract.signature_owner
        sigOperatorPath = existingContract.signature_operator
        // Pour le PDF, on doit re-recuperer le base64 depuis storage
        // (l'ancien code utilisait signOwner base64 en state).
        const [ownerB64, operatorB64] = await Promise.all([
          fetchSignatureAsBase64(sigOwnerPath),
          fetchSignatureAsBase64(sigOperatorPath),
        ])
        sigOwnerForPdf = ownerB64
        sigOperatorForPdf = operatorB64
      } else {
        const paths = await Promise.all([
          uploadSignature(signOwner, 'owner'),
          uploadSignature(signOperator, 'operator'),
        ])
        sigOwnerPath = paths[0]
        sigOperatorPath = paths[1]
        sigOwnerForPdf = signOwner
        sigOperatorForPdf = signOperator
      }

      // Downscale signatures pour PDF : reduit la RAM allouee au rendu
      // (400x150 JPEG @0.7 ≈ 15KB vs signature originale ~100KB non compressee).
      // Best-effort : si echec, on garde l'original.
      try {
        sigOwnerForPdf = await downscaleImage(sigOwnerForPdf, 400, 150, 'jpeg', 0.7)
        sigOperatorForPdf = await downscaleImage(sigOperatorForPdf, 400, 150, 'jpeg', 0.7)
      } catch (e) {
        console.warn('[install] Downscale signatures failed, using originals', e)
      }

      // 2. Insert each panel record (the panelId in URL is the QR code, not DB id)
      //    Cherche s'il existe deja par qr_code, sinon insert.
      //    Nouveau flow (juillet 2026) : plus de photo/zone captures. Les
      //    panneaux sont distingues via leur reference auto-generee `PAN-XXXX`.
      const panelsToCreate: PanelSnapshot[] = []
      for (const p of installed) {
        const reference = `PAN-${Date.now().toString(36).toUpperCase()}`

        // Existing panel ?
        const { data: existing } = await supabase
          .from('panels')
          .select('id')
          .eq('qr_code', p.qrCode)
          .maybeSingle()

        let realPanelId: string
        if (existing) {
          // Update existing
          const { error: updateErr } = await supabase.from('panels').update({
            location_id: location.id,
            zone_label: null,
            name: location.name,
            address: location.address,
            city: location.city,
            type: defaultPanelType?.name ?? null,
            status: 'active',
            installed_at: new Date().toISOString(),
            installed_by: session.user.id,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          if (updateErr) throw updateErr
          realPanelId = existing.id
        } else {
          // Insert new
          const { data: created, error: insertErr } = await supabase.from('panels').insert({
            qr_code: p.qrCode,
            reference,
            name: location.name,
            address: location.address,
            city: location.city,
            lat: lat ?? 0,
            lng: lng ?? 0,
            location_id: location.id,
            zone_label: null,
            type: defaultPanelType?.name ?? null,
            status: 'active',
            installed_at: new Date().toISOString(),
            installed_by: session.user.id,
            last_checked_at: new Date().toISOString(),
          }).select('id').single()
          if (insertErr) throw insertErr
          realPanelId = created.id
        }

        panelsToCreate.push({
          panel_id: realPanelId,
          zone_label: '',
          qr_code: p.qrCode,
          reference: existing ? p.reference : reference,
        })
      }

      // Memorise le DB id du 1er panneau pour la navigation success
      if (panelsToCreate.length > 0) {
        setSavedFirstPanelId(panelsToCreate[0].panel_id)
      }

      // 3. Create contract or amendment
      const now = new Date().toISOString()
      const company = getCompanyForPDF(companySettings)
      // Downscale logo pour PDF : 400x400 max, base64 JPEG ~30KB au lieu du
      // fichier original (souvent 500KB+). Reduit drastiquement la RAM
      // allouee au rendu react-pdf sur telephones bas de gamme.
      if (company.logoUrl) {
        try {
          company.logoUrl = await downscaleImage(company.logoUrl, 400, 400, 'png')
        } catch (e) {
          console.warn('[install] Downscale logo failed, using original', e)
        }
      }
      // ContractPDF/AmendmentPDF ignorent zoneLabels — l'ancien flow y mettait
      // les labels de zones (entree, comptoir, etc.) pour affichage. Le nouveau
      // flow ne capture plus de zones, on passe un objet vide.
      const fullZoneLabels: Record<string, string> = {}

      if (isAmendment && existingContract) {
        // Avenant : ajoute les panneaux a un contrat existant
        const { data: numData, error: rpcErr } = await supabase.rpc('get_next_amendment_number', {
          p_contract_id: existingContract.id,
        })
        if (rpcErr) throw rpcErr
        const amendmentNumber = numData as string

        // Snapshot des panneaux existants + nouveaux pour panels_after
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

        // Rendu PDF cote serveur (evite les OOM sur mobiles bas de gamme).
        const { pdfPath } = await generateContractPDFServer({
          type: 'amendment',
          fileName: `contracts/${amendmentNumber}.pdf`,
          props: {
            amendmentNumber,
            originalContractNumber: existingContract.contract_number,
            originalSignedAt: existingContract.signed_at,
            signedAt: now,
            signedCity: location.city,
            reason: 'panel_added',
            establishment: {
              name: location.name,
              address: location.address,
              postal_code: location.postal_code,
              city: location.city,
            },
            owner: {
              first_name: location.owner_first_name,
              last_name: location.owner_last_name,
              role: location.owner_role,
            },
            panelsAdded: panelsToCreate,
            panelsRemoved: [],
            panelsAfter: allPanelsSnapshot,
            signatureOwner: sigOwnerForPdf,
            signatureOperator: sigOperatorForPdf,
            company,
            zoneLabels: fullZoneLabels,
          },
        })

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
          created_by: session.user.id,
        })
        if (insertErr) throw insertErr

        await supabase
          .from('panel_contracts')
          .update({ status: 'amended' })
          .eq('id', existingContract.id)

        setSavedContractNumber(amendmentNumber)
      } else {
        // Nouveau contrat
        const { data: numData, error: rpcErr } = await supabase.rpc('get_next_contract_number')
        if (rpcErr) throw rpcErr
        const contractNumber = numData as string

        // Rendu PDF cote serveur (evite les OOM sur mobiles bas de gamme).
        const { pdfPath } = await generateContractPDFServer({
          type: 'contract',
          fileName: `contracts/${contractNumber}.pdf`,
          props: {
            contractNumber,
            signedAt: now,
            signedCity: location.city,
            establishment: {
              name: location.name,
              address: location.address,
              postal_code: location.postal_code,
              city: location.city,
              phone: location.phone,
            },
            owner: {
              first_name: location.owner_first_name,
              last_name: location.owner_last_name,
              role: location.owner_role,
              email: location.owner_email,
            },
            closingMonths: location.closing_months,
            panels: panelsToCreate,
            panelFormat: defaultPanelType ? {
              name: defaultPanelType.name,
              width_cm: defaultPanelType.width_cm,
              height_cm: defaultPanelType.height_cm,
            } : null,
            signatureOwner: sigOwnerForPdf,
            signatureOperator: sigOperatorForPdf,
            company,
            zoneLabels: fullZoneLabels,
          },
        })

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
          created_by: session.user.id,
        })
        if (insertErr) throw insertErr

        setSavedContractNumber(contractNumber)

        // Envoi automatique du contrat au gerant par email (si email fourni).
        // Best-effort : les erreurs sont juste toastees, elles ne bloquent
        // pas l'enregistrement. Le PDF est redownload du Storage (pas rerender
        // client-side) pour eviter la RAM allouee au blob.
        if (location.owner_email) {
          const pdfBlob = await downloadPDFBlob(pdfPath)
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
          if (res.ok) {
            toast(`Contrat envoyé à ${location.owner_email}`)
          } else {
            toast(`Contrat sauvegardé, envoi email échoué : ${res.error ?? 'erreur'}`, 'error')
          }
        }
      }

      // 4. Diffusions inline (si l'operateur a choisi une campagne au moment
      //    de scanner un panneau). Best-effort : les erreurs sont loggees
      //    mais ne bloquent pas le succes de l'install.
      const panelIdByQr = new Map<string, string>()
      for (let i = 0; i < installed.length; i++) {
        panelIdByQr.set(installed[i].qrCode, panelsToCreate[i].panel_id)
      }
      for (const p of installed) {
        if (!p.pendingAssign) continue
        const realPanelId = panelIdByQr.get(p.qrCode)
        if (!realPanelId) continue
        try {
          await supabase.from('panel_campaigns').insert({
            panel_id: realPanelId,
            campaign_id: p.pendingAssign.campaignId,
            assigned_by: session.user.id,
            validation_photo_path: p.pendingAssign.photoPath,
            validated_at: now,
          })
          await supabase.from('panel_photos').insert({
            panel_id: realPanelId,
            storage_path: p.pendingAssign.photoPath,
            photo_type: 'campaign',
            taken_by: session.user.id,
            taken_at: now,
          })
          await supabase
            .from('panels')
            .update({ status: 'active', last_checked_at: now, updated_at: now })
            .eq('id', realPanelId)
        } catch (assignErr) {
          console.warn('[install] Diffusion inline failed for', p.qrCode, assignErr)
        }
      }

      clearSession()
      setStep('success')
      const diffCount = installed.filter((p) => p.pendingAssign).length
      const baseMsg = isAmendment ? 'Avenant signé' : 'Installation enregistrée'
      toast(diffCount > 0 ? `${baseMsg} — ${diffCount} campagne${diffCount > 1 ? 's' : ''} diffusée${diffCount > 1 ? 's' : ''}` : baseMsg)
    } catch (e) {
      // Fallback : si l'erreur ressemble a un souci reseau (perte cours de route),
      // on queue la mutation pour replay au retour. Sinon on remonte l'erreur.
      if (isNetworkError(e)) {
        try {
          await enqueueInstall(savePayload)
          clearSession()
          setSavedContractNumber('en attente')
          setSavedFirstPanelId(installed[0]?.panelId ?? null)
          setStep('success')
          toast('Réseau perdu — enregistré localement, sync auto plus tard')
          return
        } catch {
          // fall through
        }
      }
      setError(e instanceof Error ? e.message : 'Erreur')
      setStep('another')
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  // 3 etapes si amendment (lieu → scans → save), 4 sinon (+ signatures)
  // Les sous-etapes diffuse_* sont considerees comme du step 2 (scan/recap)
  // pour ne pas polluer l'indicateur avec une infra transitoire par panneau.
  const totalSteps = isAmendment ? 3 : 4
  const stepNum = (() => {
    switch (step) {
      case 'location':
      case 'create_location':
        return 1
      case 'another':
      case 'diffuse_choice':
      case 'diffuse_campaign':
      case 'diffuse_photo':
        return 2
      case 'sign_owner':
        return 3
      case 'sign_operator':
        return 4
      default:
        return totalSteps
    }
  })()

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-2">
      {step !== 'saving' && step !== 'success' && (
        <StepIndicator current={stepNum} total={totalSteps} />
      )}

      {step === 'location' && (
        <>
          {header('Où es-tu ?', 'Choisis l\'établissement')}
          <LocationStep
            lat={lat}
            lng={lng}
            onSelect={(loc) => {
              // Lieu existant. Si l'user est entre en scannant un QR (panelId
              // dans l'URL), on l'ajoute directement comme premier panneau et
              // on propose la diffusion. Sinon on l'envoie scanner.
              setLocation(loc)
              if (panelId) {
                const first = [{ panelId, qrCode: panelId, reference: '' }]
                setInstalled(first)
                saveSession(loc, first)
                setStep('diffuse_choice')
              } else {
                saveSession(loc, [])
                navigate('/app/scan?install_session=1')
              }
            }}
            onCreateNew={() => setStep('create_location')}
            onSelectPlace={(place) => {
              // Pre-rempli le form avec les donnees Google Places
              // (le tel Google Places est souvent obsolete/inexact, on ne le pre-remplit pas)
              setNewLocationData({
                name: place.name,
                phone: '',
                owner_email: '',
                owner_first_name: '',
                owner_last_name: '',
                address: place.address,
                postal_code: place.postalCode,
                city: place.city,
              })
              setStep('create_location')
            }}
          />
        </>
      )}

      {step === 'create_location' && (
        <>
          {header('Nouvel établissement', 'Renseigne les infos du proprio', () => setStep('location'))}
          <CreateLocationStep
            initial={newLocationData}
            lat={lat}
            lng={lng}
            onSubmit={async (data) => {
              setNewLocationData(data)
              // Crée immédiatement le lieu en DB
              try {
                const { data: created, error } = await supabase
                  .from('locations')
                  .insert({
                    name: data.name.trim(),
                    address: data.address.trim(),
                    postal_code: data.postal_code.trim(),
                    city: data.city.trim(),
                    phone: data.phone.trim() || null,
                    owner_first_name: data.owner_first_name.trim(),
                    owner_last_name: data.owner_last_name.trim(),
                    owner_role: 'Gérant',
                    owner_email: data.owner_email.trim() || null,
                    has_contract: false,
                    created_by: session?.user?.id ?? null,
                  })
                  .select()
                  .single()
                if (error) throw error
                const loc = created as Location
                setLocation(loc)
                // Meme logique que le lieu existant : si scan-first, ajoute le
                // panneau et propose la diffusion. Sinon, envoie a la page de scan.
                if (panelId) {
                  const first = [{ panelId, qrCode: panelId, reference: '' }]
                  setInstalled(first)
                  saveSession(loc, first)
                  setStep('diffuse_choice')
                } else {
                  saveSession(loc, [])
                  navigate('/app/scan?install_session=1')
                }
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Erreur création', 'error')
              }
            }}
          />
        </>
      )}

      {step === 'diffuse_choice' && location && (
        <>
          {header(location.name, `Panneau ${installed.length}`, () => setStep('another'))}
          <DiffuseChoiceStep
            hasCampaigns={activeCampaigns.length > 0}
            onDiffuse={() => setStep('diffuse_campaign')}
            onSkip={() => setStep('another')}
          />
        </>
      )}

      {step === 'diffuse_campaign' && location && (
        <>
          {header('Choisis la campagne', `Panneau ${installed.length}`, () => setStep('diffuse_choice'))}
          <DiffuseCampaignStep
            campaigns={activeCampaigns}
            onSelect={(id) => {
              setDiffuseCampaignId(id)
              setStep('diffuse_photo')
            }}
          />
        </>
      )}

      {step === 'diffuse_photo' && location && diffuseCampaignId && (
        <>
          {header('Photo du visuel posé', `Panneau ${installed.length}`, () => setStep('diffuse_campaign'))}
          <DiffusePhotoStep
            panelQrCode={installed[installed.length - 1]?.qrCode ?? ''}
            campaign={activeCampaigns.find((c) => c.id === diffuseCampaignId) ?? null}
            onDone={(photoPath) => {
              const campaign = activeCampaigns.find((c) => c.id === diffuseCampaignId)
              if (!campaign) return
              setInstalled((prev) =>
                prev.map((p, i) =>
                  i === prev.length - 1
                    ? {
                        ...p,
                        pendingAssign: {
                          campaignId: campaign.id,
                          campaignName: campaign.name,
                          photoPath,
                        },
                      }
                    : p,
                ),
              )
              setDiffuseCampaignId(null)
              setStep('another')
            }}
          />
        </>
      )}

      {step === 'another' && location && (
        <>
          {header(location.name, `${installed.length} panneau${installed.length > 1 ? 'x' : ''} prêt${installed.length > 1 ? 's' : ''}`)}
          <AnotherStep
            location={location}
            installed={installed}
            isAmendment={isAmendment}
            contractLoading={contractLoading}
            onScanAnother={handleGoToScan}
            onFinish={() => {
              // Amendment : on skip les signatures (reuse celles du contrat original)
              // et on save direct. Sinon on passe aux signatures.
              if (isAmendment) handleFinalSave()
              else setStep('sign_owner')
            }}
          />
        </>
      )}

      {step === 'sign_owner' && location && (
        <>
          {header('Signature bailleur', `${location.owner_first_name} ${location.owner_last_name}`.trim() || 'Le bailleur signe ici', () => setStep('another'))}
          <SignatureStep
            label="Le bailleur signe ici"
            value={signOwner}
            onChange={setSignOwner}
            onNext={() => setStep('sign_operator')}
          />
        </>
      )}

      {step === 'sign_operator' && (
        <>
          {header('Ta signature', 'À ton tour', () => setStep('sign_owner'))}
          <SignatureStep
            label="Signe à ton tour"
            value={signOperator}
            onChange={setSignOperator}
            onNext={handleFinalSave}
            nextLabel="Signer et enregistrer"
          />
          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </>
      )}

      {step === 'saving' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Enregistrement en cours…</p>
        </div>
      )}

      {step === 'success' && (
        <SuccessStep
          location={location}
          installedCount={installed.length}
          contractNumber={savedContractNumber}
          isAmendment={isAmendment}
          firstPanelId={savedFirstPanelId ?? installed[0]?.panelId ?? panelId!}
        />
      )}
    </div>
  )
}

// ============================================================================
// Step indicator
// ============================================================================
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === current ? 'w-8 bg-primary'
            : i + 1 < current ? 'w-1.5 bg-primary'
            : 'w-1.5 bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Step 1 : LocationStep — recherche DB + Google Places
// ============================================================================
function LocationStep({
  lat, lng, onSelect, onCreateNew, onSelectPlace,
}: {
  lat: number | null
  lng: number | null
  onSelect: (loc: Location) => void
  onCreateNew: () => void
  onSelectPlace: (place: import('@/lib/google-places').PlaceSuggestion) => void
}) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [googleResults, setGoogleResults] = useState<PlaceSuggestion[]>([])
  const [nearbyResults, setNearbyResults] = useState<PlaceSuggestion[]>([])
  const [googleSearching, setGoogleSearching] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const nearbyFetchedRef = useRef(false)
  const { data: dbResults = [], isLoading: dbLoading } = useSearchLocations(debounced)

  function handleSearch(v: string) {
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(v), 300)
  }

  // Nearby (au mount, des que GPS dispo, une seule fois) : pre-remplit avec
  // ce qui est autour du panneau scanne. Meme defaut que l'ancien
  // RegisterPanelPage (150m) — fonctionnait bien.
  useEffect(() => {
    if (nearbyFetchedRef.current || lat == null || lng == null) return
    nearbyFetchedRef.current = true
    setNearbyLoading(true)
    nearbyPlaces(lng, lat)
      .then((res) => setNearbyResults(res))
      .catch(() => {})
      .finally(() => setNearbyLoading(false))
  }, [lat, lng])

  // Text search Google (quand l'operateur tape)
  useEffect(() => {
    if (debounced.trim().length < 3) {
      setGoogleResults([])
      return
    }
    let cancelled = false
    setGoogleSearching(true)
    searchPlaces(debounced, lng ?? undefined, lat ?? undefined)
      .then((res) => { if (!cancelled) setGoogleResults(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGoogleSearching(false) })
    return () => { cancelled = true }
  }, [debounced, lat, lng])

  // Filtre les suggestions Google qui matchent deja une location existante (par nom)
  const dbNames = new Set(dbResults.map((l) => l.name.toLowerCase()))
  const newGoogleSuggestions = googleResults.filter((p) => !dbNames.has(p.name.toLowerCase()))

  // Affichage : quand l'operateur n'a pas encore tape, on montre les "À proximité"
  // (nearbyResults). Des qu'il commence a taper, on bascule sur la recherche text.
  const isSearching = debounced.trim().length >= 3
  const placesToShow = isSearching ? newGoogleSuggestions : nearbyResults.filter((p) => !dbNames.has(p.name.toLowerCase()))
  const placesSectionTitle = isSearching ? 'Suggestions Google' : 'À proximité'

  const isLoading = dbLoading || (isSearching ? googleSearching : nearbyLoading)
  const hasAnyResult = dbResults.length > 0 || placesToShow.length > 0

  return (
    <div className="space-y-3">
      <Input
        autoFocus
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Nom de l'établissement…"
        className="h-12 text-base"
      />

      {isLoading && !hasAnyResult && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Bailleurs deja en base */}
      {dbResults.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Déjà enregistrés
          </p>
          {dbResults.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onSelect(loc as Location)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <Building2 className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{loc.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {loc.city}{loc.postal_code ? ` · ${loc.postal_code}` : ''}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Google Places — "À proximité" si pas de recherche, "Suggestions" si recherche text */}
      {placesToShow.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {placesSectionTitle}
          </p>
          {placesToShow.slice(0, 5).map((place) => (
            <button
              key={place.id}
              onClick={() => onSelectPlace(place)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <MapPin className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{place.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {place.address || place.city}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Nouveau
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Aucun resultat */}
      {!isLoading && debounced && !hasAnyResult && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Aucun établissement trouvé pour "{debounced}".
        </p>
      )}

      <button
        onClick={onCreateNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background py-5 text-base font-medium text-primary hover:bg-muted/30"
      >
        <Plus className="size-5" />
        Ajouter un nouvel endroit
      </button>
    </div>
  )
}

// ============================================================================
// Step 1b : CreateLocationStep — minimaliste (nom, adresse, owner, tel)
// ============================================================================
function CreateLocationStep({
  initial,
  lat,
  lng,
  onSubmit,
}: {
  initial: {
    name: string; phone: string; owner_email: string; owner_first_name: string; owner_last_name: string;
    address: string; postal_code: string; city: string;
  }
  lat: number | null
  lng: number | null
  onSubmit: (data: typeof initial) => void
}) {
  const [data, setData] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geocodedRef = useRef(false)

  function patch<K extends keyof typeof data>(key: K, value: string) {
    setData((d) => ({ ...d, [key]: value }))
  }

  // Pre-remplit adresse/CP/ville depuis le GPS au 1er mount (1 seule fois)
  useEffect(() => {
    if (geocodedRef.current || lat == null || lng == null) return
    if (data.address || data.postal_code || data.city) return
    geocodedRef.current = true
    setGeocoding(true)
    reverseGeocodeAddress(lng, lat)
      .then((res) => {
        if (!res) return
        setData((d) => ({
          ...d,
          address: d.address || res.address,
          postal_code: d.postal_code || res.postal_code,
          city: d.city || res.city,
        }))
      })
      .catch(() => {})
      .finally(() => setGeocoding(false))
  }, [lat, lng, data.address, data.postal_code, data.city])

  const canSubmit = data.name.trim() && data.address.trim() && data.city.trim() &&
                    data.owner_first_name.trim() && data.owner_last_name.trim()

  return (
    <div className="space-y-3">
      <Field label="Nom de l'établissement *">
        <Input value={data.name} onChange={(e) => patch('name', e.target.value)} placeholder="Camping Les Pins" className="h-12 text-base" autoFocus />
      </Field>

      <Field label={geocoding ? 'Adresse * (récupération GPS…)' : 'Adresse *'}>
        <div className="relative">
          <Input value={data.address} onChange={(e) => patch('address', e.target.value)} placeholder="12 Avenue de la Mer" className="h-12 text-base" />
          {geocoding && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Field label="Code postal *">
            <Input value={data.postal_code} onChange={(e) => patch('postal_code', e.target.value)} placeholder="06160" inputMode="numeric" className="h-12 text-base" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Ville *">
            <Input value={data.city} onChange={(e) => patch('city', e.target.value)} placeholder="Antibes" className="h-12 text-base" />
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-3" />

      <p className="text-sm font-medium">Le propriétaire</p>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Prénom *">
          <Input value={data.owner_first_name} onChange={(e) => patch('owner_first_name', e.target.value)} placeholder="Marie" className="h-12 text-base" />
        </Field>
        <Field label="Nom *">
          <Input value={data.owner_last_name} onChange={(e) => patch('owner_last_name', e.target.value)} placeholder="Martin" className="h-12 text-base" />
        </Field>
      </div>

      <Field label="Téléphone (facultatif)">
        <Input value={data.phone} onChange={(e) => patch('phone', e.target.value)} placeholder="04 93 00 11 22" inputMode="tel" type="tel" className="h-12 text-base" />
      </Field>

      <Field label="Email (facultatif)">
        <Input value={data.owner_email} onChange={(e) => patch('owner_email', e.target.value)} placeholder="marie@camping-les-pins.fr" inputMode="email" type="email" className="h-12 text-base" />
      </Field>

      <Button
        onClick={async () => { setSubmitting(true); try { await onSubmit(data) } finally { setSubmitting(false) } }}
        disabled={!canSubmit || submitting}
        className="mt-6 h-12 w-full text-base"
      >
        {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Suivant
      </Button>
    </div>
  )
}

// ============================================================================
// Step 2 : AnotherStep — recap + choix multi-panel
// ============================================================================
function AnotherStep({
  location,
  installed,
  isAmendment,
  contractLoading,
  onScanAnother,
  onFinish,
}: {
  location: Location
  installed: InstalledPanel[]
  isAmendment: boolean
  contractLoading: boolean
  onScanAnother: () => void
  onFinish: () => void
}) {
  const finishLabel = isAmendment
    ? `Signer l'avenant (${installed.length})`
    : `Passer à la signature (${installed.length})`
  const finishDisabled = installed.length === 0 || contractLoading

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <p className="font-medium">{location.name}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{location.city}{location.postal_code ? ` · ${location.postal_code}` : ''}</p>

        {isAmendment && (
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <strong>Avenant au contrat existant.</strong> Les signatures du contrat original sont réutilisées.
          </div>
        )}

        <div className="mt-4 space-y-2">
          {installed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun panneau scanné pour l'instant.</p>
          ) : (
            installed.map((p, i) => (
              <div key={p.panelId} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">Panneau {i + 1}</span>
                  {p.pendingAssign ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Megaphone className="size-2.5" />
                      {p.pendingAssign.campaignName}
                    </span>
                  ) : (
                    <span className="ml-1.5 text-xs text-muted-foreground">— installé vide</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onScanAnother}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background py-5 text-base font-medium text-primary hover:bg-muted/30"
      >
        <Camera className="size-5" />
        {installed.length === 0 ? 'Scanner le premier panneau' : 'Scanner un panneau de plus'}
      </button>

      <Button
        onClick={onFinish}
        disabled={finishDisabled}
        className="h-14 w-full text-base font-semibold"
      >
        {contractLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Vérification du contrat…
          </>
        ) : (
          <>
            {finishLabel}
            <ChevronRight className="ml-1 size-5" />
          </>
        )}
      </Button>
    </div>
  )
}

// ============================================================================
// Step 2b : DiffuseChoiceStep — "Diffuser maintenant ?" apres un scan
// ============================================================================
function DiffuseChoiceStep({
  hasCampaigns,
  onDiffuse,
  onSkip,
}: {
  hasCampaigns: boolean
  onDiffuse: () => void
  onSkip: () => void
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
          <Check className="size-6 text-green-600" />
        </div>
        <p className="text-base font-semibold">Panneau enregistré</p>
        <p className="mt-1 text-sm text-muted-foreground">Tu veux y poser un visuel maintenant ?</p>
      </div>

      {hasCampaigns ? (
        <>
          <Button onClick={onDiffuse} className="h-14 w-full text-base font-semibold">
            <Megaphone className="mr-2 size-5" />
            Diffuser une campagne
          </Button>
          <Button onClick={onSkip} variant="outline" className="h-12 w-full text-base">
            Passer, laisser vide
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            Aucune campagne active ne t'est assignée pour le moment.
          </div>
          <Button onClick={onSkip} className="h-14 w-full text-base font-semibold">
            Continuer (panneau vide)
            <ChevronRight className="ml-1 size-5" />
          </Button>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Step 2c : DiffuseCampaignStep — selection de la campagne a poser
// ============================================================================
function DiffuseCampaignStep({
  campaigns,
  onSelect,
}: {
  campaigns: import('@/hooks/useCampaigns').CampaignWithClient[]
  onSelect: (campaignId: string) => void
}) {
  return (
    <div className="space-y-2 pt-2">
      {campaigns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune campagne active disponible.
        </p>
      ) : (
        campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Megaphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.clients?.company_name ?? ''}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))
      )}
    </div>
  )
}

// ============================================================================
// Step 2d : DiffusePhotoStep — photo du visuel pose sur le panneau
// ============================================================================
function DiffusePhotoStep({
  panelQrCode,
  campaign,
  onDone,
}: {
  panelQrCode: string
  campaign: import('@/hooks/useCampaigns').CampaignWithClient | null
  onDone: (photoPath: string) => void
}) {
  if (!campaign) return null
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Campagne</p>
        <p className="mt-0.5 truncate font-medium">{campaign.name}</p>
        <p className="truncate text-xs text-muted-foreground">{campaign.clients?.company_name ?? ''}</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Prends la photo du visuel posé sur le panneau</p>
        <PhotoCapture
          folder={`panels/${panelQrCode}/campaigns`}
          onPhotoUploaded={(path) => {
            if (path) onDone(path)
          }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Step 4 + 5 : SignatureStep
// ============================================================================
function SignatureStep({
  label,
  value,
  onChange,
  onNext,
  nextLabel = 'Suivant',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onNext: () => void
  nextLabel?: string
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <SignatureCanvas label={label} value={value} onSignature={onChange} />
      </div>
      <Button onClick={onNext} disabled={!value} className="h-14 w-full text-base font-semibold">
        {nextLabel}
        <ChevronRight className="ml-1 size-5" />
      </Button>
    </div>
  )
}

// ============================================================================
// Success step
// ============================================================================
function SuccessStep({
  location, installedCount, contractNumber, isAmendment, firstPanelId,
}: {
  location: Location | null
  installedCount: number
  contractNumber: string | null
  isAmendment: boolean
  firstPanelId: string
}) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
        <Check className="size-8 text-green-600" />
      </div>
      <div>
        <p className="text-xl font-bold">C'est fait !</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {installedCount} panneau{installedCount > 1 ? 'x' : ''} installé{installedCount > 1 ? 's' : ''} chez {location?.name}
        </p>
        {contractNumber && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isAmendment ? 'Avenant' : 'Contrat'} #{contractNumber} signé
          </p>
        )}
      </div>

      <div className="mt-6 w-full max-w-sm space-y-2">
        {/* CTA principal : enchainer directement sur la diffusion. Le poseur est
            sur place, autant coller le visuel et prendre la photo maintenant. */}
        <Button onClick={() => navigate(`/app/assign/${firstPanelId}`)} className="h-12 w-full">
          <Megaphone className="mr-1.5 size-4" />
          Diffuser maintenant
        </Button>
        {installedCount > 1 && (
          <p className="text-[11px] text-muted-foreground">
            Tu pourras diffuser les {installedCount - 1} autre{installedCount > 2 ? 's' : ''} panneau{installedCount > 2 ? 'x' : ''} depuis leur fiche.
          </p>
        )}
        <Button onClick={() => navigate(`/app/panels/${firstPanelId}`)} className="h-12 w-full" variant="outline">
          <FileCheck className="mr-1.5 size-4" />
          Voir la fiche
        </Button>
        <Button onClick={() => navigate('/app/dashboard')} className="h-12 w-full" variant="ghost">
          Plus tard
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

async function uploadSignature(dataUrl: string, prefix: string): Promise<string> {
  const base64 = dataUrl.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'image/png' })
  const path = `signatures/${prefix}-${crypto.randomUUID()}.png`
  const { error } = await supabase.storage.from('panel-photos').upload(path, blob, {
    contentType: 'image/png', upsert: false,
  })
  if (error) throw error
  return path
}

/**
 * Re-charge une signature depuis storage et la retourne en data URL base64,
 * pour re-injection dans le PDF (cas amendement ou signatures pas dans le state).
 */
async function fetchSignatureAsBase64(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('panel-photos').download(path)
  if (error || !data) throw new Error(`Impossible de charger la signature ${path}`)
  const buf = await data.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return `data:image/png;base64,${btoa(binary)}`
}

/**
 * Convertit un Blob en string base64 (sans le prefixe data:) pour l'envoi
 * en tant que piece jointe email via la fonction edge.
 */
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

/**
 * Interpole les variables dans un template texte/HTML.
 * Ex: "Bonjour {gerant_prenom}" + {gerant_prenom: "Marie"} → "Bonjour Marie"
 */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

/** Fallback si aucun template n'est configure (rare, ne devrait pas arriver
 *  car la migration set des defaults). */
const CONTRACT_EMAIL_FALLBACK_SUBJECT = 'Votre contrat d\'installation {numero} — {entreprise}'
const CONTRACT_EMAIL_FALLBACK_BODY = `<p>Bonjour {gerant_prenom},</p><p>Vous trouverez ci-joint votre <strong>contrat d'autorisation d'installation N° {numero}</strong>, signé électroniquement.</p><p>L'équipe {entreprise}</p>`

/**
 * Envoie le contrat par email au gerant via l'edge function send-document-email.
 * Utilise le template configure dans Reglages > Email (email_contract_subject/body)
 * avec interpolation des variables : {numero}, {gerant_prenom}, {gerant_nom},
 * {etablissement}, {entreprise}.
 * N'echoue jamais : les erreurs sont loggees mais ne bloquent pas le save.
 */
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

function getCompanyForPDF(settings: ReturnType<typeof useCompanyPublic>['data']) {
  if (!settings) return {
    name: 'OOHMYAD', address: null, city: null, postal_code: null,
    siret: null, phone: null, email: null, logoUrl: null,
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

// Re-export usePanelByQrCode for typing consistency (used elsewhere)
export { usePanelByQrCode }
