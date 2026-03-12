import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import { usePanels } from '@/hooks/usePanels'
import {
  usePotentialRequest,
  useCreatePotentialRequest,
  useUpdatePotentialRequest,
  getNextPotentialNumber,
} from '@/hooks/admin/usePotentialRequests'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { supabase } from '@/lib/supabase'
import {
  geocodeCity,
  searchPotentialSpots,
  filterCoveredSpots,
  getDistanceMeters,
  autocompleteCities,
  SUPPORT_TYPES,
  type PotentialSpot,
  type SupportType,
  type CitySuggestion,
} from '@/lib/potential-search'
import { PotentialPDF } from '@/lib/pdf/PotentialPDF'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import {
  Loader2,
  Search,
  Download,
  MapPin,
  PanelTop,
  ArrowLeft,
  Send,
} from 'lucide-react'
import { POTENTIAL_STATUS_CONFIG, type PotentialStatus } from '@/lib/constants'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface VacantPanel {
  id: string
  reference: string
  address: string | null
  city: string | null
  format: string | null
  lat: number
  lng: number
}

export function PotentialNewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const mapRef = useRef<MapRef>(null)

  const { data: existingRequest, isLoading: loadingRequest } = usePotentialRequest(isNew ? undefined : id)
  const { data: allPanels } = usePanels()
  const { data: companySettings } = useCompanySettings()
  const createRequest = useCreatePotentialRequest()
  const updateRequest = useUpdatePotentialRequest()

  // Form state
  const [prospectName, setProspectName] = useState('')
  const [city, setCity] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [radiusKm, setRadiusKm] = useState(10)
  const [supportType, setSupportType] = useState<SupportType>('all')

  // Results state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [vacantPanels, setVacantPanels] = useState<VacantPanel[]>([])
  const [potentialSpots, setPotentialSpots] = useState<PotentialSpot[]>([])
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Load existing request
  useEffect(() => {
    if (!existingRequest) return
    setProspectName(existingRequest.prospect_name)
    setCity(existingRequest.city)
    setRadiusKm(existingRequest.radius_km)
    if (existingRequest.support_type) setSupportType(existingRequest.support_type as SupportType)
    if (existingRequest.lat && existingRequest.lng) {
      setCenter({ lat: existingRequest.lat, lng: existingRequest.lng })
    }
    setPotentialSpots(existingRequest.potential_spots ?? [])
    setAnalyzed(true)
    // Load vacant panels from IDs
    if (allPanels && existingRequest.existing_panel_ids?.length) {
      const ids = new Set(existingRequest.existing_panel_ids)
      setVacantPanels(
        allPanels
          .filter((p) => ids.has(p.id))
          .map((p) => ({
            id: p.id,
            reference: p.reference,
            address: p.address,
            city: p.city,
            format: p.format,
            lat: p.lat,
            lng: p.lng,
          })),
      )
    }
  }, [existingRequest, allPanels])

  const handleCityChange = useCallback((value: string) => {
    setCity(value)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    if (value.trim().length < 2) {
      setCitySuggestions([])
      setShowSuggestions(false)
      return
    }
    cityDebounceRef.current = setTimeout(async () => {
      const suggestions = await autocompleteCities(value)
      setCitySuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    }, 300)
  }, [])

  const handleCitySelect = useCallback((suggestion: CitySuggestion) => {
    setCity(suggestion.name)
    setCitySuggestions([])
    setShowSuggestions(false)
  }, [])

  useEffect(() => {
    return () => { if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current) }
  }, [])

  const canAnalyze = prospectName.trim() && city.trim()

  const runAnalysis = useCallback(async () => {
    if (!canAnalyze || !allPanels) return
    setAnalyzing(true)
    setAnalyzed(false)

    try {
      // Step 1: Geocode city
      const geo = await geocodeCity(city)
      if (!geo) {
        toast('Ville introuvable', 'error')
        setAnalyzing(false)
        return
      }
      setCenter({ lat: geo.lat, lng: geo.lng })

      // Step 2: Find vacant panels in radius
      const radiusMeters = radiusKm * 1000
      const vacant = allPanels
        .filter((p) => p.status === 'vacant')
        .filter((p) => getDistanceMeters({ lat: p.lat, lng: p.lng }, geo) <= radiusMeters)
        .map((p) => ({
          id: p.id,
          reference: p.reference,
          address: p.address,
          city: p.city,
          format: p.format,
          lat: p.lat,
          lng: p.lng,
        }))
      setVacantPanels(vacant)

      // Step 3: Search potential spots via Google Places
      const rawSpots = await searchPotentialSpots(geo.lat, geo.lng, radiusKm, supportType, (done, total) => {
        setAnalysisProgress(`Scan zone ${done}/${total}...`)
      })

      // Step 4: Filter covered spots
      const filtered = filterCoveredSpots(
        rawSpots,
        allPanels.map((p) => ({ lat: p.lat, lng: p.lng })),
      )
      setPotentialSpots(filtered)
      setAnalyzed(true)

      // Fly map to center
      mapRef.current?.flyTo({ center: [geo.lng, geo.lat], zoom: 11, duration: 1500 })
    } catch {
      toast("Erreur lors de l'analyse", 'error')
    } finally {
      setAnalyzing(false)
      setAnalysisProgress('')
    }
  }, [canAnalyze, allPanels, city, radiusKm, supportType])

  const handleSave = useCallback(async () => {
    if (!center) return
    setSaving(true)
    try {
      let finalReference = existingRequest?.reference ?? ''
      if (isNew) {
        finalReference = await getNextPotentialNumber()
      }

      const payload = {
        reference: finalReference,
        prospect_name: prospectName,
        city,
        radius_km: radiusKm,
        support_type: supportType,
        lat: center.lat,
        lng: center.lng,
        existing_panels_count: vacantPanels.length,
        potential_spots_count: potentialSpots.length,
        existing_panel_ids: vacantPanels.map((p) => p.id),
        potential_spots: potentialSpots,
        status: (existingRequest?.status ?? 'draft') as 'draft' | 'sent',
      }

      if (isNew) {
        const created = await createRequest.mutateAsync(payload)
        toast('Demande enregistrée')
        navigate(`/admin/potential/${created.id}`, { replace: true })
      } else {
        await updateRequest.mutateAsync({ id: id!, ...payload })
        toast('Demande mise à jour')
      }
    } catch {
      toast("Erreur lors de l'enregistrement", 'error')
    } finally {
      setSaving(false)
    }
  }, [center, existingRequest, isNew, prospectName, city, radiusKm, supportType, vacantPanels, potentialSpots, createRequest, updateRequest, id, navigate])

  const handleStatusChange = useCallback(async (newStatus: 'draft' | 'sent') => {
    if (!id || isNew) return
    try {
      await updateRequest.mutateAsync({ id, status: newStatus })
      toast(newStatus === 'sent' ? 'Marqué comme envoyé' : 'Repassé en brouillon')
    } catch {
      toast('Erreur', 'error')
    }
  }, [id, isNew, updateRequest])

  const handleGeneratePDF = useCallback(async () => {
    if (!companySettings) return
    setGeneratingPdf(true)
    try {
      // Get logo URL
      let logoUrl: string | undefined
      if (companySettings.logo_path) {
        const { data } = supabase.storage.from('company-assets').getPublicUrl(companySettings.logo_path)
        if (data?.publicUrl) logoUrl = data.publicUrl
      }

      const reference = existingRequest?.reference ?? 'POT-DRAFT'

      const supportLabel = SUPPORT_TYPES.find((s) => s.value === supportType)?.label ?? 'Tous les supports'

      const blob = await pdf(
        <PotentialPDF
          reference={reference}
          prospectName={prospectName}
          city={city}
          radiusKm={radiusKm}
          supportTypeLabel={supportLabel}
          createdAt={existingRequest?.created_at ?? new Date().toISOString()}
          existingPanels={vacantPanels.map((p) => ({
            reference: p.reference,
            address: p.address,
            city: p.city,
            format: p.format,
          }))}
          potentialSpots={potentialSpots}
          company={{
            ...companySettings,
            logo_url: logoUrl,
          }}
        />,
      ).toBlob()
      saveAs(blob, `${reference}.pdf`)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    } finally {
      setGeneratingPdf(false)
    }
  }, [companySettings, existingRequest, prospectName, city, radiusKm, vacantPanels, potentialSpots])

  // Map viewport
  const mapCenter = useMemo(() => {
    if (center) return { longitude: center.lng, latitude: center.lat, zoom: 11 }
    return { longitude: 2.3522, latitude: 46.6034, zoom: 5 }
  }, [center])

  if (!isNew && loadingRequest) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/potential')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {isNew ? 'Nouvelle demande de potentiel' : `${existingRequest?.reference ?? 'Potentiel'}`}
          </h1>
          {existingRequest && (
            <Badge variant={POTENTIAL_STATUS_CONFIG[existingRequest.status as PotentialStatus]?.variant ?? 'secondary'}>
              {POTENTIAL_STATUS_CONFIG[existingRequest.status as PotentialStatus]?.label ?? existingRequest.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {existingRequest && existingRequest.status === 'draft' && (
            <Button variant="outline" onClick={() => handleStatusChange('sent')}>
              <Send className="mr-1.5 size-4" />
              Marquer envoyé
            </Button>
          )}
          {existingRequest && existingRequest.status === 'sent' && (
            <Button variant="outline" onClick={() => handleStatusChange('draft')}>
              Repasser brouillon
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Prospect *</label>
              <Input
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Nom du prospect"
                className="text-sm"
              />
            </div>
            <div className="relative space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ville *</label>
              <Input
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Lyon, Marseille..."
                className="text-sm"
                autoComplete="off"
              />
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
                  {citySuggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type="button"
                      onMouseDown={() => handleCitySelect(s)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type de support</label>
              <select
                value={supportType}
                onChange={(e) => setSupportType(e.target.value as SupportType)}
                className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SUPPORT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rayon : {radiusKm} km</label>
              <input
                type="range"
                min={1}
                max={50}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <Button onClick={runAnalysis} disabled={!canAnalyze || analyzing}>
            {analyzing ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Search className="mr-1.5 size-4" />
            )}
            {analyzing ? (analysisProgress || 'Analyse en cours...') : "Lancer l'analyse"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analyzed && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Panneaux vacants</p>
                  <PanelTop className="size-4 text-blue-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{vacantPanels.length}</p>
                <p className="text-xs text-muted-foreground">Disponibles immédiatement</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Emplacements potentiels</p>
                  <MapPin className="size-4 text-orange-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-orange-600">{potentialSpots.length}</p>
                <p className="text-xs text-muted-foreground">Non encore installés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground">Potentiel total</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{vacantPanels.length + potentialSpots.length}</p>
                <p className="text-xs text-muted-foreground">{city} — rayon {radiusKm} km</p>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          {MAPBOX_TOKEN && (
            <Card>
              <CardContent className="p-0">
                <div className="h-[400px] overflow-hidden rounded-lg">
                  <Map
                    ref={mapRef}
                    initialViewState={mapCenter}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <NavigationControl position="top-right" />
                    {/* Vacant panels — blue markers */}
                    {vacantPanels.map((panel) => (
                      <Marker key={panel.id} longitude={panel.lng} latitude={panel.lat}>
                        <div
                          className="size-3 rounded-full border-2 border-white bg-blue-600 shadow"
                          title={`${panel.reference} — ${panel.address ?? panel.city ?? ''}`}
                        />
                      </Marker>
                    ))}
                    {/* Potential spots — orange markers */}
                    {potentialSpots.map((spot, i) => (
                      <Marker key={`spot-${i}`} longitude={spot.lng} latitude={spot.lat}>
                        <div
                          className="size-3 rounded-full border-2 border-white bg-orange-500 shadow"
                          title={`${spot.name} — ${spot.typeLabel}`}
                        />
                      </Marker>
                    ))}
                  </Map>
                </div>
                <div className="flex gap-4 px-4 py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full bg-blue-600" />
                    Panneau vacant existant
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full bg-orange-500" />
                    Emplacement potentiel
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details tables */}
          {vacantPanels.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-semibold">Panneaux vacants disponibles ({vacantPanels.length})</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Référence</th>
                      <th className="pb-2 font-medium text-muted-foreground">Adresse</th>
                      <th className="pb-2 font-medium text-muted-foreground">Ville</th>
                      <th className="pb-2 font-medium text-muted-foreground">Format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {vacantPanels.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 font-medium">{p.reference}</td>
                        <td className="py-2 text-muted-foreground">{p.address ?? '—'}</td>
                        <td className="py-2 text-muted-foreground">{p.city ?? '—'}</td>
                        <td className="py-2 text-muted-foreground">{p.format ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {potentialSpots.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-semibold">Emplacements potentiels ({potentialSpots.length})</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Nom du lieu</th>
                      <th className="pb-2 font-medium text-muted-foreground">Adresse</th>
                      <th className="pb-2 font-medium text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {potentialSpots.map((spot, i) => (
                      <tr key={i}>
                        <td className="py-2 font-medium">{spot.name}</td>
                        <td className="py-2 text-muted-foreground">{spot.address}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-[10px]">{spot.typeLabel}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isNew ? 'Enregistrer' : 'Mettre à jour'}
            </Button>
            <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
              Générer le PDF
            </Button>
            <Button variant="outline" onClick={runAnalysis} disabled={analyzing}>
              <Search className="mr-1.5 size-4" />
              Relancer l'analyse
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
