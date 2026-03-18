import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Map, { Popup, NavigationControl, Source, Layer } from 'react-map-gl/mapbox'
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'
import type { GeoJSONSource } from 'mapbox-gl'
import { useQuery } from '@tanstack/react-query'
import { usePanels } from '@/hooks/usePanels'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Filter, Loader2, Locate, MapPinOff, Search } from 'lucide-react'
import { PANEL_STATUSES, PANEL_STATUS_CONFIG, type PanelStatus } from '@/lib/constants'
import type { Panel, PanelWithLocation } from '@/types'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const DEFAULT_VIEW = { longitude: 2.3522, latitude: 48.8566, zoom: 5 }

function getPanelColor(panel: Panel, campaignIds: Set<string>): string {
  if (panel.status === 'maintenance' || panel.status === 'missing') return '#f97316'
  if (campaignIds.has(panel.id)) return '#ef4444'
  if (panel.status === 'vacant') return '#6b7280'
  return '#22c55e'
}

function estimateZoom(panels: Panel[]): number {
  const lats = panels.map((p) => p.lat)
  const lngs = panels.map((p) => p.lng)
  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs))
  if (spread < 0.01) return 15
  if (spread < 0.1) return 12
  if (spread < 1) return 9
  if (spread < 5) return 7
  return 5
}

export function MapPage() {
  const { data: panels, isLoading } = usePanels()
  const mapRef = useRef<MapRef>(null)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPanel, setSelectedPanel] = useState<PanelWithLocation | null>(null)
  const [viewState, setViewState] = useState(DEFAULT_VIEW)
  const initialCenteredRef = useRef(false)

  // Search with debounce
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const statusFilter = searchParams.get('status') as PanelStatus | null
  const cityFilter = searchParams.get('city')
  const campaignFilter = searchParams.get('campaign') as 'with' | 'without' | null

  // Campaign indicator
  const { data: panelCampaigns = new Set<string>() } = useQuery({
    queryKey: ['active-campaign-panels'],
    queryFn: async () => {
      const { data } = await supabase
        .from('panel_campaigns')
        .select('panel_id')
        .is('unassigned_at', null)
      return new Set((data ?? []).map((d) => d.panel_id))
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const filteredPanels = useMemo(() => {
    if (!panels) return []
    return panels.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (cityFilter && p.city !== cityFilter) return false
      if (campaignFilter === 'with' && !panelCampaigns.has(p.id)) return false
      if (campaignFilter === 'without' && panelCampaigns.has(p.id)) return false
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase()
        const haystack = [p.reference, p.name, p.address, p.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [panels, statusFilter, cityFilter, campaignFilter, panelCampaigns, debouncedSearch])

  const cities = useMemo(() => {
    if (!panels) return []
    const set = new Set(panels.map((p) => p.city).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [panels])

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    if (!panels) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const p of panels) {
      counts[p.status] = (counts[p.status] || 0) + 1
    }
    return counts
  }, [panels])

  // Auto-center on panels at first load
  useEffect(() => {
    if (initialCenteredRef.current || !filteredPanels.length) return
    initialCenteredRef.current = true
    const lats = filteredPanels.map((p) => p.lat)
    const lngs = filteredPanels.map((p) => p.lng)
    setViewState({
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      zoom: estimateZoom(filteredPanels),
    })
  }, [filteredPanels])

  // Fly to search results when debounced search changes
  useEffect(() => {
    if (!debouncedSearch.trim() || !filteredPanels.length) return
    if (filteredPanels.length === 1) {
      const p = filteredPanels[0]
      setViewState({ latitude: p.lat, longitude: p.lng, zoom: 16 })
      setSelectedPanel(p)
    } else {
      const lats = filteredPanels.map((p) => p.lat)
      const lngs = filteredPanels.map((p) => p.lng)
      setViewState({
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        zoom: estimateZoom(filteredPanels),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filteredPanels])

  // GeoJSON for clustering
  const geojson = useMemo(() => {
    if (!filteredPanels.length) return null
    return {
      type: 'FeatureCollection' as const,
      features: filteredPanels.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          color: getPanelColor(p, panelCampaigns),
        },
      })),
    }
  }, [filteredPanels, panelCampaigns])

  // Lookup panel by id
  const panelMap = useMemo(() => {
    const map = new globalThis.Map<string, PanelWithLocation>()
    for (const p of panels ?? []) map.set(p.id, p)
    return map
  }, [panels])

  // Handle map click
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const features = e.features
      if (!features?.length) {
        setSelectedPanel(null)
        return
      }

      const feature = features[0]

      if (feature.properties?.cluster) {
        const clusterId = feature.properties.cluster_id as number
        const source = mapRef.current?.getSource('panels') as GeoJSONSource | undefined
        if (!source) return
        source.getClusterExpansionZoom(clusterId, (_err, zoom) => {
          const coords = (feature.geometry as GeoJSON.Point).coordinates
          mapRef.current?.easeTo({
            center: [coords[0], coords[1]],
            zoom: (zoom ?? 14) + 1,
            duration: 500,
          })
        })
        return
      }

      const panelId = feature.properties?.id as string
      const panel = panelMap.get(panelId)
      if (panel) {
        setViewState((v) => ({ ...v, latitude: panel.lat, longitude: panel.lng }))
        setSelectedPanel(panel)
      }
    },
    [panelMap],
  )

  const handleCenterOnPanels = useCallback(() => {
    if (!filteredPanels.length) return
    const lats = filteredPanels.map((p) => p.lat)
    const lngs = filteredPanels.map((p) => p.lng)
    setViewState({
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      zoom: estimateZoom(filteredPanels),
    })
  }, [filteredPanels])

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    setSearchParams(params)
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
        <p className="text-lg font-medium">Token Mapbox manquant</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajoutez VITE_MAPBOX_TOKEN dans .env.local pour activer la carte.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par référence, nom, adresse..."
            className="flex h-9 w-56 rounded-lg border border-input bg-background pl-10 pr-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setFilter('status', e.target.value || null)}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-1 text-sm"
          >
            <option value="">Tous les statuts ({panels?.length ?? 0})</option>
            {PANEL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PANEL_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <select
          value={cityFilter ?? ''}
          onChange={(e) => {
            setFilter('city', e.target.value || null)
            // Auto-center on the selected city's panels
            if (!panels) return
            const cityPanels = e.target.value
              ? panels.filter((p) => p.city === e.target.value)
              : panels
            if (cityPanels.length) {
              const lats = cityPanels.map((p) => p.lat)
              const lngs = cityPanels.map((p) => p.lng)
              setViewState({
                latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
                longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
                zoom: estimateZoom(cityPanels),
              })
            }
          }}
          className="flex h-9 appearance-none rounded-lg border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={campaignFilter ?? ''}
          onChange={(e) => setFilter('campaign', e.target.value || null)}
          className="flex h-9 appearance-none rounded-lg border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">Toutes les campagnes</option>
          <option value="with">Avec campagne</option>
          <option value="without">Sans campagne</option>
        </select>
        <button
          onClick={handleCenterOnPanels}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-accent"
        >
          <Locate className="size-4" />
          Recentrer
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredPanels.length} panneau{filteredPanels.length !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Map */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="relative flex-1">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
            interactiveLayerIds={['clusters', 'unclustered-point']}
          >
            <NavigationControl position="top-right" />

            {geojson && (
              <Source
                id="panels"
                type="geojson"
                data={geojson}
                cluster
                clusterMaxZoom={14}
                clusterRadius={50}
              >
                <Layer
                  id="clusters"
                  type="circle"
                  filter={['has', 'point_count']}
                  paint={{
                    'circle-color': '#6366f1',
                    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
                    'circle-stroke-width': 3,
                    'circle-stroke-color': 'rgba(99, 102, 241, 0.3)',
                  }}
                />
                <Layer
                  id="cluster-count"
                  type="symbol"
                  filter={['has', 'point_count']}
                  layout={{
                    'text-field': ['get', 'point_count_abbreviated'],
                    'text-size': 13,
                    'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
                    'text-allow-overlap': true,
                  }}
                  paint={{ 'text-color': '#ffffff' }}
                />
                <Layer
                  id="unclustered-point"
                  type="circle"
                  filter={['!', ['has', 'point_count']]}
                  paint={{
                    'circle-color': ['get', 'color'],
                    'circle-radius': 7,
                    'circle-stroke-width': 2.5,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
              </Source>
            )}

            {!filteredPanels.length && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50">
                <MapPinOff className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Aucun panneau</p>
              </div>
            )}

            {selectedPanel && (
              <Popup
                longitude={selectedPanel.lng}
                latitude={selectedPanel.lat}
                anchor="bottom"
                onClose={() => setSelectedPanel(null)}
                closeButton={false}
                closeOnClick={false}
                offset={12}
                className="ooh-popup"
              >
                <div className="min-w-[220px] space-y-2.5 p-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold">{selectedPanel.locations?.name || selectedPanel.name || selectedPanel.reference}</p>
                      <StatusBadge status={selectedPanel.status as PanelStatus} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {selectedPanel.city || selectedPanel.address || '—'}
                    </p>
                    {panelCampaigns.has(selectedPanel.id) && (
                      <span className="mt-1 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                        Campagne active
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/admin/panels/${selectedPanel.id}`}
                    className="flex items-center justify-center rounded-md bg-foreground py-1.5 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90"
                  >
                    Voir la fiche
                  </Link>
                </div>
              </Popup>
            )}
          </Map>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border bg-background/90 px-3 py-2 backdrop-blur">
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full bg-[#22c55e]" />
                <span>Actif</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full bg-[#6b7280]" />
                <span>Vacant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full bg-[#f97316]" />
                <span>Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full bg-[#ef4444]" />
                <span>Campagne active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
