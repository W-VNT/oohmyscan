// ============================================================================
// FreePanelWizardPage : diffusion "panneau libre" (sans QR, photo unitaire
// liee a un lieu de notre DB `locations`).
//
// Flow :
//   1. Choix lieu (identique InstallWizardPage step 'location' :
//      search DB + suggestions Google Places + creation via Places ou vierge)
//   2. Prise photo (+ GPS)
//   3. Save (INSERT campaign_free_panels)
//   4. Chain : "meme lieu" | "autre lieu" | "terminer"
//
// La photo est liee au location_id (notre DB), pas au Google Place ID.
// Elle remonte dans la fiche campagne admin (section "Panneaux libres").
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, ChevronRight, Loader2, MapPin, Package, Plus, CheckCircle2 } from 'lucide-react'
import { useCampaign } from '@/hooks/useCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useSearchLocations } from '@/hooks/useLocations'
import { nearbyPlaces, searchPlaces, type PlaceSuggestion } from '@/lib/google-places'
import { reverseGeocodeAddress } from '@/lib/mapbox'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error-logger'
import type { Location } from '@/types'

type Step = 'location' | 'create_location' | 'photo' | 'done'

interface LocationForm {
  name: string
  phone: string
  owner_email: string
  owner_first_name: string
  owner_last_name: string
  address: string
  postal_code: string
  city: string
}

const EMPTY_LOCATION_FORM: LocationForm = {
  name: '', phone: '', owner_email: '',
  owner_first_name: '', owner_last_name: '',
  address: '', postal_code: '', city: '',
}

export function FreePanelWizardPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: campaign, isLoading } = useCampaign(campaignId)
  const { lat, lng, requestPosition } = useGeolocation()

  const [step, setStep] = useState<Step>('location')
  const [location, setLocation] = useState<Location | null>(null)
  const [locationFormInitial, setLocationFormInitial] = useState<LocationForm>(EMPTY_LOCATION_FORM)
  const [sessionCount, setSessionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { requestPosition() }, [requestPosition])

  async function handleSelectExistingLocation(loc: Location) {
    setLocation(loc)
    setStep('photo')
  }

  function handleSelectGooglePlace(place: PlaceSuggestion) {
    // Pre-remplit le form de creation avec les infos du Google Place
    setLocationFormInitial({
      name: place.name,
      phone: '',
      owner_email: '',
      owner_first_name: '',
      owner_last_name: '',
      address: place.address ?? '',
      postal_code: place.postalCode ?? '',
      city: place.city ?? '',
    })
    setStep('create_location')
  }

  function handleCreateNew() {
    setLocationFormInitial(EMPTY_LOCATION_FORM)
    setStep('create_location')
  }

  async function handleCreateLocation(data: LocationForm) {
    if (!session?.user?.id) return
    setError(null)
    try {
      const { data: created, error: insertErr } = await supabase.from('locations').insert({
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
        created_by: session.user.id,
      }).select().single()
      if (insertErr) throw insertErr
      setLocation(created as Location)
      setStep('photo')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création lieu')
      void logError('other', 'free_panel_create_location', e, {
        campaign_id: campaignId, place_name: data.name,
      })
    }
  }

  async function handlePhotoUploaded(path: string) {
    if (!campaignId || !location || !session?.user?.id) return
    setError(null)
    try {
      const { error: insertErr } = await supabase.from('campaign_free_panels').insert({
        campaign_id: campaignId,
        operator_id: session.user.id,
        location_id: location.id,
        photo_path: path,
        lat: lat ?? null,
        lng: lng ?? null,
      })
      if (insertErr) throw insertErr
      setSessionCount((c) => c + 1)
      setStep('done')
      toast('Panneau libre enregistré', 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
      void logError('other', 'free_panel_insert', e, {
        campaign_id: campaignId, location_id: location.id,
      })
    }
  }

  function handleChainSameLocation() {
    setStep('photo')
  }

  function handleChainNewLocation() {
    setLocation(null)
    setStep('location')
  }

  function handleFinish() {
    navigate('/app/dashboard')
  }

  function goBack() {
    if (step === 'location') navigate('/app/diffuse')
    else if (step === 'create_location') setStep('location')
    else if (step === 'photo') setStep('location')
    else if (step === 'done') navigate('/app/dashboard')
  }

  if (isLoading) return <LoadingScreen />
  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium">Campagne introuvable</p>
          <button onClick={() => navigate('/app/diffuse')} className="mt-4 text-sm text-primary underline">
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={goBack} aria-label="Retour" className="rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{campaign.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            Panneau libre {sessionCount > 0 && `· ${sessionCount} pose${sessionCount > 1 ? 's' : ''} déjà`}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {step === 'location' && (
          <LocationStep
            lat={lat}
            lng={lng}
            onSelect={handleSelectExistingLocation}
            onSelectPlace={handleSelectGooglePlace}
            onCreateNew={handleCreateNew}
          />
        )}

        {step === 'create_location' && (
          <CreateLocationStep
            initial={locationFormInitial}
            lat={lat}
            lng={lng}
            onSubmit={handleCreateLocation}
          />
        )}

        {step === 'photo' && location && (
          <PhotoStep location={location} campaignId={campaignId!} onUploaded={handlePhotoUploaded} />
        )}

        {step === 'done' && location && (
          <DoneStep
            locationName={location.name}
            campaignName={campaign.name}
            sessionCount={sessionCount}
            onSameLocation={handleChainSameLocation}
            onNewLocation={handleChainNewLocation}
            onFinish={handleFinish}
          />
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// LocationStep : identique InstallWizardPage — search DB + Google Places
// ============================================================================
function LocationStep({
  lat, lng, onSelect, onCreateNew, onSelectPlace,
}: {
  lat: number | null
  lng: number | null
  onSelect: (loc: Location) => void
  onCreateNew: () => void
  onSelectPlace: (place: PlaceSuggestion) => void
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

  useEffect(() => {
    if (nearbyFetchedRef.current || lat == null || lng == null) return
    nearbyFetchedRef.current = true
    setNearbyLoading(true)
    nearbyPlaces(lng, lat)
      .then((res) => setNearbyResults(res))
      .catch(() => {})
      .finally(() => setNearbyLoading(false))
  }, [lat, lng])

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

  const dbNames = new Set(dbResults.map((l) => l.name.toLowerCase()))
  const newGoogleSuggestions = googleResults.filter((p) => !dbNames.has(p.name.toLowerCase()))
  const isSearching = debounced.trim().length >= 3
  const placesToShow = isSearching ? newGoogleSuggestions : nearbyResults.filter((p) => !dbNames.has(p.name.toLowerCase()))
  const placesSectionTitle = isSearching ? 'Suggestions Google' : 'À proximité'
  const showLoader = dbLoading || (isSearching ? googleSearching : nearbyLoading)
  const hasAnyResult = dbResults.length > 0 || placesToShow.length > 0

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Où poses-tu ce panneau ?</p>
        <p className="text-xs text-muted-foreground">Cherche un lieu déjà connu ou ajoute-en un nouveau.</p>
      </div>
      <Input
        autoFocus
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Nom de l'établissement…"
        className="h-12 text-base"
      />

      {showLoader && !hasAnyResult && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {dbResults.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Déjà enregistrés</p>
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

      {placesToShow.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{placesSectionTitle}</p>
          {placesToShow.slice(0, 5).map((place) => (
            <button
              key={place.id}
              onClick={() => onSelectPlace(place)}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <MapPin className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{place.name}</p>
                <p className="truncate text-xs text-muted-foreground">{place.address || place.city}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Nouveau</span>
            </button>
          ))}
        </div>
      )}

      {!showLoader && debounced && !hasAnyResult && (
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
// CreateLocationStep : identique InstallWizardPage — proprio 100% facultatif
// ============================================================================
function CreateLocationStep({
  initial, lat, lng, onSubmit,
}: {
  initial: LocationForm
  lat: number | null
  lng: number | null
  onSubmit: (data: LocationForm) => void
}) {
  const [data, setData] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geocodedRef = useRef(false)

  function patch<K extends keyof LocationForm>(key: K, value: string) {
    setData((d) => ({ ...d, [key]: value }))
  }

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

  // Meme regle que InstallWizardPage : proprio 100% facultatif
  const canSubmit = data.name.trim() && data.address.trim() && data.city.trim()

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Nouvel établissement</p>
        <p className="text-xs text-muted-foreground">Le proprio est facultatif — tu peux compléter plus tard.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom *</label>
        <Input value={data.name} onChange={(e) => patch('name', e.target.value)} placeholder="Camping Les Pins" className="h-12 text-base" autoFocus />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {geocoding ? 'Adresse * (récupération GPS…)' : 'Adresse *'}
        </label>
        <div className="relative">
          <Input value={data.address} onChange={(e) => patch('address', e.target.value)} placeholder="12 Avenue de la Mer" className="h-12 text-base" />
          {geocoding && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">CP *</label>
          <Input value={data.postal_code} onChange={(e) => patch('postal_code', e.target.value)} placeholder="06160" inputMode="numeric" className="h-12 text-base" />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Ville *</label>
          <Input value={data.city} onChange={(e) => patch('city', e.target.value)} placeholder="Antibes" className="h-12 text-base" />
        </div>
      </div>

      <div className="border-t border-border pt-3" />

      <p className="text-sm font-medium">Le propriétaire</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Prénom (facultatif)</label>
          <Input value={data.owner_first_name} onChange={(e) => patch('owner_first_name', e.target.value)} placeholder="Marie" className="h-12 text-base" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom (facultatif)</label>
          <Input value={data.owner_last_name} onChange={(e) => patch('owner_last_name', e.target.value)} placeholder="Martin" className="h-12 text-base" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Téléphone (facultatif)</label>
        <Input value={data.phone} onChange={(e) => patch('phone', e.target.value)} placeholder="04 93 00 11 22" inputMode="tel" type="tel" className="h-12 text-base" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Email (facultatif)</label>
        <Input value={data.owner_email} onChange={(e) => patch('owner_email', e.target.value)} placeholder="marie@camping-les-pins.fr" inputMode="email" type="email" className="h-12 text-base" />
      </div>

      <Button
        onClick={async () => { setSubmitting(true); try { await onSubmit(data) } finally { setSubmitting(false) } }}
        disabled={!canSubmit || submitting}
        className="mt-2 h-12 w-full text-base"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Continuer'}
      </Button>
    </div>
  )
}

// ============================================================================
// PhotoStep
// ============================================================================
function PhotoStep({
  location, campaignId, onUploaded,
}: {
  location: Location
  campaignId: string
  onUploaded: (path: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{location.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {location.city}{location.postal_code ? ` · ${location.postal_code}` : ''}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Photo du panneau posé</p>
        <p className="text-xs text-muted-foreground">Prends une photo du support installé sur ce lieu.</p>
      </div>
      <PhotoCapture
        folder={`campaigns/${campaignId}/free-panels`}
        stickyGallery
        onPhotoUploaded={onUploaded}
      />
    </div>
  )
}

// ============================================================================
// DoneStep : chain 3 options
// ============================================================================
function DoneStep({
  locationName, campaignName, sessionCount,
  onSameLocation, onNewLocation, onFinish,
}: {
  locationName: string
  campaignName: string
  sessionCount: number
  onSameLocation: () => void
  onNewLocation: () => void
  onFinish: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold">Panneau enregistré ✓</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Posé au <span className="font-medium">{locationName}</span> pour <span className="font-medium">{campaignName}</span>
        </p>
        {sessionCount > 1 && (
          <p className="mt-2 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {sessionCount} poses dans cette session
          </p>
        )}
      </div>

      <Button onClick={onSameLocation} className="h-14 w-full text-base">
        <Package className="mr-2 size-4" />
        Poser un autre panneau ici
      </Button>
      <Button onClick={onNewLocation} variant="outline" className="h-14 w-full text-base">
        <MapPin className="mr-2 size-4" />
        Aller sur un autre lieu
      </Button>
      <Button onClick={onFinish} variant="ghost" className="h-12 w-full text-sm">
        Enregistrer
      </Button>
    </div>
  )
}
