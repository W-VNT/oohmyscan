import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Search,
  MapPinned,
  Phone,
  Camera,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCreatePanel } from '@/hooks/usePanels'
import { toast } from '@/components/shared/Toast'
import { useAuth } from '@/hooks/useAuth'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { supabase } from '@/lib/supabase'
import { PANEL_FORMATS, PANEL_TYPES } from '@/lib/constants'
import { isValidUUID } from '@/lib/utils'
import { searchPlaces, nearbyPlaces, type PlaceSuggestion } from '@/lib/google-places'

type Step = 1 | 2 | 3

export function RegisterPanelPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()

  if (!isValidUUID(panelId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Identifiant de panneau invalide</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary underline">Retour</button>
      </div>
    )
  }
  const { lat, lng, accuracy, loading: gpsLoading, error: gpsError, requestPosition } = useGeolocation()
  const createPanel = useCreatePanel()

  const [step, setStep] = useState<Step>(1)

  // Step 1: Place
  const [placeQuery, setPlaceQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null)
  const [manualName, setManualName] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualCity, setManualCity] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Step 2: Contact & details
  const [contactPhone, setContactPhone] = useState('')
  const [format, setFormat] = useState('')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')

  // Step 3: Photo
  const [photoPath, setPhotoPath] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    requestPosition()
  }, [requestPosition])

  // Fetch nearby POIs as soon as GPS is acquired
  const nearbyFetchedRef = useRef(false)
  useEffect(() => {
    if (!lat || !lng || nearbyFetchedRef.current || selectedPlace) return
    nearbyFetchedRef.current = true
    setSearching(true)
    nearbyPlaces(lng, lat).then((results) => {
      if (results.length && !selectedPlace && !placeQuery.trim()) {
        setSuggestions(results)
      }
      setSearching(false)
    })
  }, [lat, lng, selectedPlace, placeQuery])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Debounced search
  const handleQueryChange = useCallback(
    (value: string) => {
      setPlaceQuery(value)
      setSelectedPlace(null)
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (!value.trim() || !lat || !lng) {
        setSuggestions([])
        return
      }

      debounceRef.current = setTimeout(async () => {
        setSearching(true)
        const results = await searchPlaces(value, lng, lat)
        setSuggestions(results)
        setSearching(false)
      }, 300)
    },
    [lat, lng],
  )

  function selectPlace(place: PlaceSuggestion) {
    setSelectedPlace(place)
    setPlaceQuery(place.name)
    setSuggestions([])
    setManualName(place.name)
    setManualAddress(place.address)
    setManualCity(place.city)
  }

  function canGoStep2() {
    return (selectedPlace || manualName.trim()) && lat && lng
  }

  function canGoStep3() {
    return true // contact phone is optional
  }

  async function handleSubmit() {
    if (!lat || !lng) {
      setError('Position GPS requise')
      return
    }
    if (!photoPath) {
      setError('Photo requise')
      return
    }
    if (!panelId) return

    setSubmitting(true)
    setError(null)

    try {
      const reference = `PAN-${Date.now().toString(36).toUpperCase()}`

      const panel = await createPanel.mutateAsync({
        qr_code: panelId,
        reference,
        name: manualName || null,
        address: manualAddress || null,
        city: manualCity || null,
        contact_phone: contactPhone || null,
        lat: selectedPlace?.lat ?? lat,
        lng: selectedPlace?.lng ?? lng,
        format: format || null,
        type: type || null,
        notes: notes || null,
        status: 'active',
        installed_at: new Date().toISOString(),
        installed_by: session?.user?.id,
        last_checked_at: new Date().toISOString(),
      })

      await supabase.from('panel_photos').insert({
        panel_id: panel.id,
        storage_path: photoPath,
        photo_type: 'installation',
        taken_by: session?.user?.id,
      })

      toast('Panneau enregistré avec succès')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const stepLabels = ['Lieu', 'Détails', 'Photo']

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : navigate(-1))}
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">Nouveau point</h1>
      </div>

      {/* Steps indicator */}
      <div className="px-4 pt-4">
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Étape {step}/3 — {stepLabels[step - 1]}
        </p>
      </div>

      {/* GPS status (always visible) */}
      <div className="mx-4 mt-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex items-center gap-2 text-[13px]">
          <MapPin className="size-3.5" />
          {gpsLoading ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Acquisition GPS...
            </span>
          ) : lat && lng ? (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="size-3" />
              Position acquise
              {accuracy && (
                <span className="text-[11px] text-muted-foreground">
                  (±{Math.round(accuracy)}m)
                </span>
              )}
            </span>
          ) : (
            <span className="text-destructive-foreground">
              {gpsError ?? 'GPS indisponible'}
              <button
                onClick={requestPosition}
                className="ml-2 text-primary underline"
              >
                Réessayer
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* ─── Step 1: Lieu ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Où se trouve le point ?</p>
              <p className="text-[12px] text-muted-foreground">
                Tapez le nom du commerce ou lieu pour trouver l'adresse
              </p>
            </div>

            {/* Search input */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={placeQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Ex: Tabac, Boulangerie, Gare..."
                  className="h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                {searching && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                  {suggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => selectPlace(place)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <MapPinned className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{place.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {place.address}
                          {place.city ? `, ${place.city}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected place card */}
            {selectedPlace && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/20 dark:bg-green-500/10">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-600" />
                  <div>
                    <p className="text-[13px] font-medium text-green-900 dark:text-green-200">
                      {selectedPlace.name}
                    </p>
                    <p className="text-[12px] text-green-700 dark:text-green-300">
                      {selectedPlace.address}
                      {selectedPlace.city ? `, ${selectedPlace.city}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual fallback fields (shown if no place selected and user typed something) */}
            {!selectedPlace && placeQuery.trim() && suggestions.length === 0 && !searching && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-[12px] text-muted-foreground">
                  Aucun résultat ? Remplissez manuellement :
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nom du lieu"
                    maxLength={100}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="Adresse"
                    maxLength={150}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="Ville"
                    maxLength={80}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!canGoStep2()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-[14px] font-medium text-background transition-colors disabled:opacity-40"
            >
              Continuer
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {/* ─── Step 2: Contact & Détails ─── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Recap lieu */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[13px] font-medium">{manualName || 'Sans nom'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {manualAddress}
                    {manualCity ? `, ${manualCity}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact phone */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="size-3.5" />
                Téléphone du lieu
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ex: 01 23 45 67 89"
                maxLength={20}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Optionnel — utile pour recontacter le commerce
              </p>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Format du panneau</label>
              <div className="flex flex-wrap gap-2">
                {PANEL_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(format === f ? '' : f)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      format === f
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de panneau</label>
              <div className="flex flex-wrap gap-2">
                {PANEL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(type === t ? '' : t)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      type === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Observations..."
                rows={2}
                maxLength={500}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!canGoStep3()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-[14px] font-medium text-background transition-colors disabled:opacity-40"
            >
              Continuer
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {/* ─── Step 3: Photo + Submit ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="size-4" />
                <p className="text-sm font-medium">Photo d'installation</p>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Prenez une photo du panneau installé
              </p>
            </div>

            <PhotoCapture
              folder={`panels/${panelId}`}
              onPhotoUploaded={setPhotoPath}
            />

            {/* Recap */}
            {photoPath && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Récapitulatif
                </p>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lieu</span>
                    <span className="font-medium">{manualName || '—'}</span>
                  </div>
                  {manualAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adresse</span>
                      <span className="text-right">{manualAddress}</span>
                    </div>
                  )}
                  {manualCity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ville</span>
                      <span>{manualCity}</span>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tél.</span>
                      <span>{contactPhone}</span>
                    </div>
                  )}
                  {format && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format</span>
                      <span>{format}</span>
                    </div>
                  )}
                  {type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{type}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-1 text-green-600">
                    <CheckCircle className="size-3" />
                    <span className="text-[12px]">Photo prise</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !photoPath || !lat || !lng}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Valider l'installation"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
