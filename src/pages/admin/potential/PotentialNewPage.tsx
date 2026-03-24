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
  X,
  Upload,
} from 'lucide-react'
import { POTENTIAL_STATUS_CONFIG, type PotentialStatus } from '@/lib/constants'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const COMMUNE_ONLY_RADIUS = 2 // km when slider = 0 (commune center only)

interface VacantPanel {
  id: string
  reference: string
  address: string | null
  city: string | null
  type: string | null
  lat: number
  lng: number
}

export function PotentialNewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const mapRef = useRef<MapRef>(null)
  const savedIdRef = useRef<string | null>(isNew ? null : id ?? null)

  const { data: existingRequest, isLoading: loadingRequest } = usePotentialRequest(isNew && !savedIdRef.current ? undefined : savedIdRef.current ?? id)
  const { data: allPanels } = usePanels()
  const { data: companySettings } = useCompanySettings()
  const createRequest = useCreatePotentialRequest()
  const updateRequest = useUpdatePotentialRequest()

  // Form state
  const [prospectName, setProspectName] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [cityInput, setCityInput] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [radiusKm, setRadiusKm] = useState(10)
  const [supportType, setSupportType] = useState<SupportType>('all')

  // CSV import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')

  // Results state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [vacantPanels, setVacantPanels] = useState<VacantPanel[]>([])
  const [potentialSpots, setPotentialSpots] = useState<PotentialSpot[]>([])
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Load existing request
  useEffect(() => {
    if (!existingRequest) return
    setProspectName(existingRequest.prospect_name)
    // Load cities from array field, fallback to single city
    if (existingRequest.cities?.length) {
      setCities(existingRequest.cities)
    } else if (existingRequest.city) {
      setCities([existingRequest.city])
    }
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
            type: p.type,
            lat: p.lat,
            lng: p.lng,
          })),
      )
    }
  }, [existingRequest, allPanels])

  // --- City input with autocomplete ---
  const handleCityInputChange = useCallback((value: string) => {
    setCityInput(value)
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

  const addCity = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCities((prev) => prev.includes(trimmed) ? prev : [...prev, trimmed])
    setCityInput('')
    setCitySuggestions([])
    setShowSuggestions(false)
  }, [])

  const removeCity = useCallback((name: string) => {
    setCities((prev) => prev.filter((c) => c !== name))
  }, [])

  const handleCityKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCity(cityInput)
    }
  }, [addCity, cityInput])

  useEffect(() => {
    return () => { if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current) }
  }, [])

  // --- CSV Import ---
  function handleImport() {
    const lines = importText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    const parsed: string[] = []
    for (const line of lines) {
      // Support formats: "Ville; 69000" or "Ville, 69000" or just "Ville"
      const parts = line.split(/[;,]/).map((s) => s.trim()).filter((s) => s.length > 0)
      if (parts.length >= 2) {
        // "Nom Ville" + "Code Postal" → combine for precise geocoding
        parsed.push(`${parts[0]} ${parts[1]}`)
      } else if (parts.length === 1) {
        parsed.push(parts[0])
      }
    }
    if (parsed.length === 0) {
      toast('Aucune commune trouvée', 'error')
      return
    }
    setCities((prev) => {
      const existing = new Set(prev)
      const newCities = parsed.filter((c) => !existing.has(c))
      return [...prev, ...newCities]
    })
    setRadiusKm(0) // CSV = communes exactes, pas de rayon
    setImportText('')
    setShowImportModal(false)
    toast(`${parsed.length} commune${parsed.length > 1 ? 's' : ''} importée${parsed.length > 1 ? 's' : ''}`)
  }

  // --- Analysis ---
  const canAnalyze = prospectName.trim() && cities.length > 0

  const runAnalysis = useCallback(async () => {
    if (!canAnalyze || !allPanels) return
    setAnalyzing(true)
    setAnalyzed(false)

    try {
      const allVacant: VacantPanel[] = []
      const allSpots: PotentialSpot[] = []
      let firstCenter: { lat: number; lng: number } | null = null
      const totalCities = cities.length
      const radius = radiusKm || COMMUNE_ONLY_RADIUS

      for (let i = 0; i < totalCities; i++) {
        const cityName = cities[i]
        setAnalysisProgress(`Géocodage ${cityName} (${i + 1}/${totalCities})...`)

        const geo = await geocodeCity(cityName)
        if (!geo) {
          toast(`Ville introuvable : ${cityName}`, 'error')
          continue
        }
        if (!firstCenter) firstCenter = { lat: geo.lat, lng: geo.lng }

        // Find vacant panels
        const radiusMeters = radius * 1000
        const vacant = allPanels
          .filter((p) => p.status === 'vacant')
          .filter((p) => getDistanceMeters({ lat: p.lat, lng: p.lng }, geo) <= radiusMeters)
          .filter((p) => !allVacant.some((v) => v.id === p.id)) // deduplicate
          .map((p) => ({
            id: p.id,
            reference: p.reference,
            address: p.address,
            city: p.city,
            type: p.type,
            lat: p.lat,
            lng: p.lng,
          }))
        allVacant.push(...vacant)

        // Search potential spots
        setAnalysisProgress(`Scan ${cityName} (${i + 1}/${totalCities})...`)
        const rawSpots = await searchPotentialSpots(geo.lat, geo.lng, radius, supportType, (done, total) => {
          setAnalysisProgress(`Scan ${cityName} — zone ${done}/${total}`)
        })
        const filtered = filterCoveredSpots(
          rawSpots,
          allPanels.map((p) => ({ lat: p.lat, lng: p.lng })),
        )
        // Deduplicate spots by place name + address
        const existingKeys = new Set(allSpots.map((s) => `${s.name}|${s.address}`))
        const newSpots = filtered.filter((s) => !existingKeys.has(`${s.name}|${s.address}`))
        allSpots.push(...newSpots)
      }

      setVacantPanels(allVacant)
      setPotentialSpots(allSpots)
      if (firstCenter) setCenter(firstCenter)
      setAnalyzed(true)

      // Fly map
      if (firstCenter) {
        mapRef.current?.flyTo({
          center: [firstCenter.lng, firstCenter.lat],
          zoom: totalCities > 1 ? 8 : 11,
          duration: 1500,
        })
      }

      // Auto-save after analysis
      if (firstCenter) {
        try {
          const cityDisplay = cities.join(', ')
          const savePayload = {
            reference: existingRequest?.reference ?? '',
            prospect_name: prospectName,
            city: cityDisplay,
            cities,
            radius_km: radius,
            support_type: supportType,
            lat: firstCenter.lat,
            lng: firstCenter.lng,
            existing_panels_count: allVacant.length,
            potential_spots_count: allSpots.length,
            existing_panel_ids: allVacant.map((p) => p.id),
            potential_spots: allSpots,
            status: (existingRequest?.status ?? 'draft') as 'draft' | 'sent',
          }

          const currentId = savedIdRef.current
          if (!currentId) {
            savePayload.reference = await getNextPotentialNumber()
            const created = await createRequest.mutateAsync(savePayload as Parameters<typeof createRequest.mutateAsync>[0])
            savedIdRef.current = created.id
            navigate(`/admin/potential/${created.id}`, { replace: true })
            toast('Analyse enregistrée automatiquement')
          } else {
            // Update existing — use direct supabase call to avoid type issues
            const { error: updateErr } = await supabase
              .from('potential_requests')
              .update(savePayload)
              .eq('id', currentId)
            if (updateErr) throw updateErr
            toast('Analyse mise à jour')
          }
        } catch (err) {
          console.error('Auto-save failed:', err)
          toast("Erreur lors de l'enregistrement automatique", 'error')
        }
      }
    } catch {
      toast("Erreur lors de l'analyse", 'error')
    } finally {
      setAnalyzing(false)
      setAnalysisProgress('')
    }
  }, [canAnalyze, allPanels, cities, radiusKm, supportType, prospectName, existingRequest, createRequest, updateRequest, navigate])


  // --- Status change ---
  const handleStatusChange = useCallback(async (newStatus: 'draft' | 'sent') => {
    const targetId = savedIdRef.current
    if (!targetId) return
    try {
      await updateRequest.mutateAsync({ id: targetId, status: newStatus })
      toast(newStatus === 'sent' ? 'Marqué comme envoyé' : 'Repassé en brouillon')
    } catch {
      toast('Erreur', 'error')
    }
  }, [updateRequest])

  // --- PDF ---
  const handleGeneratePDF = useCallback(async () => {
    if (!companySettings) return
    setGeneratingPdf(true)
    try {
      let logoUrl: string | undefined
      if (companySettings.logo_path) {
        const { data } = supabase.storage.from('company-assets').getPublicUrl(companySettings.logo_path)
        if (data?.publicUrl) logoUrl = data.publicUrl
      }

      const reference = existingRequest?.reference ?? 'POT-DRAFT'
      const supportLabel = SUPPORT_TYPES.find((s) => s.value === supportType)?.label ?? 'Tous les supports'
      const cityDisplay = cities.join(', ')
      const radius = radiusKm

      const blob = await pdf(
        <PotentialPDF
          reference={reference}
          prospectName={prospectName}
          city={cityDisplay}
          radiusKm={radius}
          supportTypeLabel={supportLabel}
          createdAt={existingRequest?.created_at ?? new Date().toISOString()}
          existingPanels={vacantPanels.map((p) => ({
            reference: p.reference,
            address: p.address,
            city: p.city,
            type: p.type,
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
  }, [companySettings, existingRequest, prospectName, cities, radiusKm, vacantPanels, potentialSpots, supportType])

  function handleExportCSV() {
    const headers = ['Type', 'Nom / Référence', 'Adresse', 'Ville', 'Type de lieu']
    const rows: string[][] = []

    for (const p of vacantPanels) {
      rows.push(['Panneau existant', p.reference, p.address ?? '', p.city ?? '', p.type ?? ''])
    }
    for (const sp of potentialSpots) {
      rows.push(['Emplacement potentiel', sp.name, sp.address, '', sp.typeLabel])
    }

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `potentiel-${cities.join('-') || 'analyse'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Map viewport
  const mapCenter = useMemo(() => {
    if (center) return { longitude: center.lng, latitude: center.lat, zoom: cities.length > 1 ? 8 : 11 }
    return { longitude: 2.3522, latitude: 46.6034, zoom: 5 }
  }, [center, cities.length])

  if (!isNew && loadingRequest) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/potential')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {!savedIdRef.current && isNew ? 'Nouvelle demande de potentiel' : `${existingRequest?.reference ?? 'Potentiel'}`}
          </h1>
          {existingRequest && (
            <Badge variant={POTENTIAL_STATUS_CONFIG[existingRequest.status as PotentialStatus]?.variant ?? 'secondary'}>
              {POTENTIAL_STATUS_CONFIG[existingRequest.status as PotentialStatus]?.label ?? existingRequest.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {analyzed && (
            <>
              <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analyzing}>
                <Search className="mr-1.5 size-3.5" />
                Relancer
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPdf}>
                {generatingPdf ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-1.5 size-3.5" />
                CSV
              </Button>
            </>
          )}
          {existingRequest && existingRequest.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('sent')}>
              <Send className="mr-1.5 size-3.5" />
              Marquer envoyé
            </Button>
          )}
          {existingRequest && existingRequest.status === 'sent' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('draft')}>
              Repasser brouillon
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Prospect *</label>
              <Input
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Nom du prospect"
                className="text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Type de support</label>
              <select
                value={supportType}
                onChange={(e) => setSupportType(e.target.value as SupportType)}
                className="flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {SUPPORT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Rayon : {radiusKm === 0 ? 'Communes uniquement' : `${radiusKm} km`}
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </div>

          {/* Multi-city input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="mb-2 block text-sm font-medium">
                Communes * {cities.length > 0 && `(${cities.length})`}
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="mr-1 size-3" />
                Importer
              </Button>
            </div>

            {/* City chips */}
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCity(c)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* City input with autocomplete */}
            <div className="relative">
              <Input
                value={cityInput}
                onChange={(e) => handleCityInputChange(e.target.value)}
                onKeyDown={handleCityKeyDown}
                onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Ajouter une commune..."
                className="text-sm"
                autoComplete="off"
              />
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
                  {citySuggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type="button"
                      onMouseDown={() => addCity(s.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportModal(false)}>
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Importer des communes</h2>
              <button onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Une commune par ligne, au format <strong>Nom; Code Postal</strong>. Le code postal permet un géocodage précis.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Lyon; 69000\nMarseille; 13000\nToulouse; 31000\n\nFormat : Ville; Code Postal (une par ligne)"}
              rows={8}
              className="mb-4 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
                <Upload className="mr-1.5 size-3.5" />
                Importer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {analyzed && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Panneaux vacants</p>
                  <PanelTop className="size-4 text-blue-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{vacantPanels.length}</p>
                <p className="text-xs text-muted-foreground">Disponibles immédiatement</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Emplacements potentiels</p>
                  <MapPin className="size-4 text-orange-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-orange-600">{potentialSpots.length}</p>
                <p className="text-xs text-muted-foreground">Non encore installés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground">Potentiel total</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{vacantPanels.length + potentialSpots.length}</p>
                <p className="text-xs text-muted-foreground">
                  {radiusKm === 0
                    ? `${cities.length} commune${cities.length > 1 ? 's' : ''} (exactes)`
                    : cities.length === 1
                      ? `${cities[0]} — rayon ${radiusKm} km`
                      : `${cities.length} communes — rayon ${radiusKm} km`
                  }
                </p>
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
                    {vacantPanels.map((panel) => (
                      <Marker key={panel.id} longitude={panel.lng} latitude={panel.lat}>
                        <div
                          className="size-3 rounded-full border-2 border-white bg-blue-600 shadow"
                          title={`${panel.reference} — ${panel.address ?? panel.city ?? ''}`}
                        />
                      </Marker>
                    ))}
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
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold">Panneaux vacants disponibles ({vacantPanels.length})</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Référence</th>
                      <th className="pb-2 font-medium text-muted-foreground">Adresse</th>
                      <th className="pb-2 font-medium text-muted-foreground">Ville</th>
                      <th className="pb-2 font-medium text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {vacantPanels.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 font-medium">{p.reference}</td>
                        <td className="py-2 text-muted-foreground">{p.address ?? '—'}</td>
                        <td className="py-2 text-muted-foreground">{p.city ?? '—'}</td>
                        <td className="py-2 text-muted-foreground">{p.type ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {potentialSpots.length > 0 && (
            <Card>
              <CardContent>
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
        </>
      )}
    </div>
  )
}
