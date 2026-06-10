/**
 * Wizard unifie d'installation panneau + contrat.
 *
 * Remplace l'ancienne paire RegisterPanelPage + ContractPage par un flow
 * lineaire en 5 ecrans (3 si avenant) :
 *  1. Etablissement (selection ou creation)
 *  2. Photo + position dans le site
 *  3. Autre panneau ici ? (multi-panel optionnel)
 *  4. Signature bailleur
 *  5. Signature operateur
 *
 * Optimise pour un opérateur sur le terrain : zero vocabulaire metier,
 * boutons grand format, 1 question / ecran, GPS auto.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Plus, Camera, Check, Building2, ChevronRight, FileCheck } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'

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
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { useActivePanelTypes } from '@/hooks/admin/usePanelTypes'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'
import { PANEL_ZONES } from '@/lib/constants'
import { ContractPDF } from '@/lib/pdf/ContractPDF'
import { AmendmentPDF } from '@/lib/pdf/AmendmentPDF'
import type { Location } from '@/types'

// ============================================================================
// Types
// ============================================================================

type Step = 'location' | 'create_location' | 'photo_zone' | 'another' | 'sign_owner' | 'sign_operator' | 'saving' | 'success'

interface InstalledPanel {
  panelId: string
  qrCode: string
  reference: string
  photoPath: string
  zone: string  // ex: 'entrance' or 'custom:Bar piscine'
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
  ts: number
}

function saveSession(location: Location, installed: InstalledPanel[]) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ location, installed, ts: Date.now() } satisfies PersistedSession))
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
  const { data: companySettings } = useCompanySettings()
  const { data: panelTypes } = useActivePanelTypes()

  // Continuation d'une session multi-panneaux ?
  const continueFromSession = searchParams.get('continue') === '1'

  if (!isValidUUID(panelId)) {
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
    owner_first_name: '',
    owner_last_name: '',
    address: '',
    postal_code: '',
    city: '',
  })
  const [installed, setInstalled] = useState<InstalledPanel[]>([])
  // Photo + zone du panneau en cours (panelId actuel)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const [customZone, setCustomZone] = useState('')
  const [signOwner, setSignOwner] = useState('')
  const [signOperator, setSignOperator] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedContractNumber, setSavedContractNumber] = useState<string | null>(null)
  const [savedFirstPanelId, setSavedFirstPanelId] = useState<string | null>(null)

  // ============== GPS init ==============
  useEffect(() => { requestPosition() }, [requestPosition])

  // ============== Restore session multi-panneau (continuation) ==============
  // Si on arrive avec ?continue=1, on restaure le wizard de la session precedente
  // et on saute directement a l'ecran photo pour le nouveau panneau.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || !continueFromSession) return
    const persisted = loadSession()
    if (!persisted) return
    restoredRef.current = true
    setLocation(persisted.location)
    setInstalled(persisted.installed)
    setStep('photo_zone')
  }, [continueFromSession])

  // ============== Detect existing contract for amendment ==============
  const { data: existingContract } = useLocationContract(location?.id)
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
  // Save : creation des panneaux + contrat
  // ============================================================================
  async function handleFinalSave() {
    if (!location || !session?.user?.id) {
      setError('Donnees incomplètes')
      setStep('sign_operator')
      return
    }
    if (!signOwner || !signOperator) {
      setError('Signatures manquantes')
      setStep('sign_operator')
      return
    }
    setStep('saving')
    setError(null)

    try {
      // 1. Upload signatures
      const [sigOwnerPath, sigOperatorPath] = await Promise.all([
        uploadSignature(signOwner, 'owner'),
        uploadSignature(signOperator, 'operator'),
      ])

      // 2. Insert each panel record (the panelId in URL is the QR code, not DB id)
      //    Cherche s'il existe deja par qr_code, sinon insert.
      const panelsToCreate: PanelSnapshot[] = []
      for (const p of installed) {
        const zoneName = zoneLabel(p.zone)
        const autoName = location.name + (zoneName ? ` — ${zoneName}` : '')
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
            zone_label: p.zone,
            name: autoName,
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
            name: autoName,
            address: location.address,
            city: location.city,
            lat: lat ?? 0,
            lng: lng ?? 0,
            location_id: location.id,
            zone_label: p.zone,
            type: defaultPanelType?.name ?? null,
            status: 'active',
            installed_at: new Date().toISOString(),
            installed_by: session.user.id,
            last_checked_at: new Date().toISOString(),
          }).select('id').single()
          if (insertErr) throw insertErr
          realPanelId = created.id
        }

        // Insert photo record
        const { error: photoErr } = await supabase.from('panel_photos').insert({
          panel_id: realPanelId,
          storage_path: p.photoPath,
          photo_type: 'installation',
          taken_at: new Date().toISOString(),
          taken_by: session.user.id,
        })
        if (photoErr) throw photoErr

        panelsToCreate.push({
          panel_id: realPanelId,
          zone_label: p.zone,
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
      const fullZoneLabels: Record<string, string> = Object.fromEntries(
        PANEL_ZONES.map((z) => [z.value, z.label]),
      )
      for (const p of panelsToCreate) {
        if (p.zone_label.startsWith('custom:')) {
          fullZoneLabels[p.zone_label] = p.zone_label.slice(7)
        }
      }

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

        const pdfPath = await generateAndUploadPDF(amendmentNumber, (
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
            signatureOwner={signOwner}
            signatureOperator={signOperator}
            company={company}
            zoneLabels={fullZoneLabels}
          />
        ))

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

        const pdfPath = await generateAndUploadPDF(contractNumber, (
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
            signatureOwner={signOwner}
            signatureOperator={signOperator}
            company={company}
            zoneLabels={fullZoneLabels}
          />
        ))

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
      }

      clearSession()
      setStep('success')
      toast(isAmendment ? 'Avenant signé' : 'Installation enregistrée')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setStep('sign_operator')
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  const totalSteps = isAmendment ? 4 : 5
  const stepNum = (() => {
    switch (step) {
      case 'location':
      case 'create_location':
        return 1
      case 'photo_zone':
      case 'another':
        return 2
      case 'sign_owner':
        return isAmendment ? 3 : 3
      case 'sign_operator':
        return isAmendment ? 4 : 4
      default:
        return 5
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
            onSelect={(loc) => { setLocation(loc); setStep('photo_zone') }}
            onCreateNew={() => setStep('create_location')}
            onSelectPlace={(place) => {
              // Pre-rempli le form avec les donnees Google Places
              setNewLocationData({
                name: place.name,
                phone: place.phone,
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
                    owner_email: null,
                    has_contract: false,
                    created_by: session?.user?.id ?? null,
                  })
                  .select()
                  .single()
                if (error) throw error
                setLocation(created as Location)
                setStep('photo_zone')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Erreur création', 'error')
              }
            }}
          />
        </>
      )}

      {step === 'photo_zone' && location && (
        <>
          {header(location.name, `Panneau ${installed.length + 1}`, () => {
            if (installed.length === 0) setStep('location')
            else setStep('another')
          })}
          <PhotoZoneStep
            panelId={panelId!}
            photoPath={currentPhoto}
            zone={currentZone}
            customZone={customZone}
            onPhotoChange={setCurrentPhoto}
            onZoneChange={setCurrentZone}
            onCustomZoneChange={setCustomZone}
            onNext={() => {
              if (!currentPhoto || !currentZone) return
              const finalZone = currentZone === 'other' ? `custom:${customZone.trim()}` : currentZone
              // Le panelId de l'URL est le QR code (convention de ScanPage).
              // La reference est generee a save time dans handleFinalSave.
              setInstalled((prev) => [...prev, {
                panelId: panelId!,
                qrCode: panelId!,
                reference: '',
                photoPath: currentPhoto,
                zone: finalZone,
              }])
              setCurrentPhoto(null)
              setCurrentZone(null)
              setCustomZone('')
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
            onScanAnother={() => {
              // Persiste la session et navigate vers le scanner
              saveSession(location, installed)
              navigate('/app/scan?install_session=1')
            }}
            onFinish={() => setStep('sign_owner')}
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
            nextLabel="Valider et terminer"
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
    name: string; phone: string; owner_first_name: string; owner_last_name: string;
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
// Step 2 : PhotoZoneStep — photo + position dans le site
// ============================================================================
function PhotoZoneStep({
  panelId,
  photoPath,
  zone,
  customZone,
  onPhotoChange,
  onZoneChange,
  onCustomZoneChange,
  onNext,
}: {
  panelId: string
  photoPath: string | null
  zone: string | null
  customZone: string
  onPhotoChange: (path: string | null) => void
  onZoneChange: (z: string | null) => void
  onCustomZoneChange: (v: string) => void
  onNext: () => void
}) {
  const canNext = !!photoPath && !!zone && (zone !== 'other' || customZone.trim().length > 0)

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Prends la photo du panneau installé</p>
        <PhotoCapture
          folder={`panels/${panelId}`}
          onPhotoUploaded={onPhotoChange}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Où as-tu posé le panneau ?</p>
        <div className="grid grid-cols-2 gap-2">
          {PANEL_ZONES.map((z) => {
            const isSelected = zone === z.value
            return (
              <button
                key={z.value}
                onClick={() => onZoneChange(z.value)}
                className={`flex h-14 items-center justify-center rounded-xl border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {z.label}
              </button>
            )
          })}
          <button
            onClick={() => onZoneChange('other')}
            className={`col-span-2 flex h-14 items-center justify-center rounded-xl border-2 text-sm font-medium transition-all ${
              zone === 'other'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-dashed border-border bg-card hover:border-primary/50'
            }`}
          >
            Autre…
          </button>
        </div>
        {zone === 'other' && (
          <Input
            value={customZone}
            onChange={(e) => onCustomZoneChange(e.target.value)}
            placeholder="Ex: Terrasse sud, Salle de sport…"
            className="mt-2 h-12 text-base"
            autoFocus
          />
        )}
      </div>

      <Button onClick={onNext} disabled={!canNext} className="h-12 w-full text-base">
        Suivant
        <ChevronRight className="ml-1 size-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// Step 3 : AnotherStep — recap + choix multi-panel
// ============================================================================
function AnotherStep({
  location,
  installed,
  isAmendment,
  onScanAnother,
  onFinish,
}: {
  location: Location
  installed: InstalledPanel[]
  isAmendment: boolean
  onScanAnother: () => void
  onFinish: () => void
}) {
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
            <strong>Avenant au contrat existant.</strong> Le bailleur signera l'ajout des nouveaux panneaux.
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          {installed.map((p, i) => (
            <div key={p.panelId} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-green-600" />
              <span className="font-medium">Panneau {i + 1}</span>
              <span className="text-muted-foreground">— {zoneLabel(p.zone)}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onScanAnother}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background py-5 text-base font-medium text-primary hover:bg-muted/30"
      >
        <Camera className="size-5" />
        Oui, en poser un de plus
      </button>

      <Button onClick={onFinish} className="h-14 w-full text-base font-semibold">
        Non, faire signer
        <ChevronRight className="ml-1 size-5" />
      </Button>
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
        <Button onClick={() => navigate(`/app/panels/${firstPanelId}`)} className="h-12 w-full" variant="outline">
          <FileCheck className="mr-1.5 size-4" />
          Voir la fiche
        </Button>
        <Button onClick={() => navigate('/app/dashboard')} className="h-12 w-full">
          Retour accueil
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
    contentType: 'image/png', upsert: false,
  })
  if (error) throw error
  return path
}

async function generateAndUploadPDF(docNumber: string, element: React.ReactElement<DocumentProps>): Promise<string> {
  const blob = await pdf(element).toBlob()
  const path = `contracts/${docNumber}.pdf`
  const { error } = await supabase.storage.from('panel-photos').upload(path, blob, {
    contentType: 'application/pdf', upsert: true,
  })
  if (error) throw error
  return path
}

function getCompanyForPDF(settings: ReturnType<typeof useCompanySettings>['data']) {
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
