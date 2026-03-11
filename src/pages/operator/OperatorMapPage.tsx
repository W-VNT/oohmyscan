import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Loader2, LocateFixed, Navigation, Eye, Search, X, MapPinOff, CircleCheck, Megaphone, AlertTriangle } from 'lucide-react'
import type { Panel } from '@/types'
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox'
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'
import type { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const USER_ZOOM = 16

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function openDirections(lat: number, lng: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`, '_blank')
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank')
  }
}

function getPanelColor(panel: Panel, campaignIds: Set<string>): string {
  const hasIssue = panel.status === 'maintenance' || panel.status === 'missing'
  if (hasIssue) return '#f97316'
  if (campaignIds.has(panel.id)) return '#ef4444'
  return '#22c55e'
}

export function OperatorMapPage() {
  const { data: panels, isLoading } = usePanels()
  const mapRef = useRef<MapRef>(null)
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 12,
  })
  const [userPos, setUserPos] = useState<{ lng: number; lat: number } | null>(null)
  const [locating, setLocating] = useState(true)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Campaign indicator — TanStack Query
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

  const flyToUser = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserPos({ lat: latitude, lng: longitude })
        setViewState({ latitude, longitude, zoom: USER_ZOOM })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    flyToUser()
  }, [flyToUser])

  // Build GeoJSON for clustering
  const geojson = useMemo(() => {
    if (!panels?.length) return null
    return {
      type: 'FeatureCollection' as const,
      features: panels.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          color: getPanelColor(p, panelCampaigns),
        },
      })),
    }
  }, [panels, panelCampaigns])

  // Lookup panel by id for click events
  const panelMap = useMemo(() => {
    const map = new globalThis.Map<string, Panel>()
    for (const p of panels ?? []) map.set(p.id, p)
    return map
  }, [panels])

  // Handle map click on interactive layers (clusters + points)
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const features = e.features
      if (!features?.length) {
        setSelectedPanel(null)
        return
      }

      const feature = features[0]

      // Cluster → zoom in
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

      // Individual point → center map + show popup
      const panelId = feature.properties?.id as string
      const panel = panelMap.get(panelId)
      if (panel) {
        setViewState((v) => ({ ...v, latitude: panel.lat, longitude: panel.lng }))
        setSelectedPanel(panel)
      }
    },
    [panelMap],
  )

  // Search results
  const searchResults = useMemo(() => {
    if (!panels || !search.trim()) return []
    const q = search.toLowerCase()
    return panels
      .filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q),
      )
      .slice(0, 5)
  }, [panels, search])

  function flyToPanel(panel: Panel) {
    setViewState({ latitude: panel.lat, longitude: panel.lng, zoom: 17 })
    setSelectedPanel(panel)
    setShowSearch(false)
    setSearch('')
  }

  // Distance to selected panel
  const distanceToSelected = useMemo(() => {
    if (!selectedPanel || !userPos) return null
    return getDistance(userPos.lat, userPos.lng, selectedPanel.lat, selectedPanel.lng)
  }, [selectedPanel, userPos])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-medium">Carte non disponible</p>
        <p className="mt-2 text-sm text-muted-foreground">Token Mapbox manquant</p>
      </div>
    )
  }

  if (isLoading && locating) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100dvh-4rem-env(safe-area-inset-top))]">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        interactiveLayerIds={['clusters', 'unclustered-point']}
      >
        {/* User position */}
        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-8 animate-ping rounded-full bg-blue-500/20" />
              <div className="size-3.5 rounded-full border-2 border-white bg-blue-500 shadow-md" />
            </div>
          </Marker>
        )}

        {/* Clustered panel markers */}
        {geojson && (
          <Source
            id="panels"
            type="geojson"
            data={geojson}
            cluster
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Cluster circles */}
            <Layer
              id="clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': '#6366f1',
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  18,   // default radius
                  10, 22, // 10+ points
                  50, 28, // 50+ points
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': 'rgba(99, 102, 241, 0.3)',
              }}
            />

            {/* Cluster count label */}
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
              paint={{
                'text-color': '#ffffff',
              }}
            />

            {/* Individual points */}
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

        {/* Dark popup */}
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
            <div className="min-w-[200px] space-y-2.5 p-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold">{selectedPanel.name || selectedPanel.reference}</p>
                  {(() => {
                    const hasIssue = selectedPanel.status === 'maintenance' || selectedPanel.status === 'missing'
                    const occupied = panelCampaigns.has(selectedPanel.id)
                    const label = hasIssue ? 'Problème' : occupied ? 'Occupé' : 'Libre'
                    const cls = hasIssue
                      ? 'bg-orange-500/15 text-orange-400'
                      : occupied
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-green-500/15 text-green-400'
                    return (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
                        {label}
                      </span>
                    )
                  })()}
                </div>
                {(selectedPanel.name || selectedPanel.city) && (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {selectedPanel.name}{selectedPanel.name && selectedPanel.city ? ' · ' : ''}{selectedPanel.city}
                  </p>
                )}
                {distanceToSelected !== null && (
                  <p className="mt-0.5 text-[11px] font-semibold text-blue-400">
                    à {formatDistance(distanceToSelected)}
                  </p>
                )}
              </div>

              <div className="flex gap-1.5">
                <Link
                  to={`/panels/${selectedPanel.id}`}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
                >
                  <Eye className="size-3" />
                  Voir
                </Link>
                <button
                  onClick={() => openDirections(selectedPanel.lat, selectedPanel.lng)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-foreground py-1.5 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Navigation className="size-3" />
                  Itinéraire
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating search bar */}
      <div className="fixed left-3 right-3 z-10" style={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
        {showSearch ? (
          <div className="rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un point..."
                className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearch('') }} aria-label="Fermer la recherche" className="flex size-10 items-center justify-center">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-border">
                {searchResults.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => flyToPanel(panel)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-muted/50"
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getPanelColor(panel, panelCampaigns) }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{panel.name || panel.reference}</p>
                      {(panel.city || panel.name) && (
                        <p className="truncate text-[11px] text-muted-foreground">{panel.city || panel.name}</p>
                      )}
                    </div>
                    {userPos && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {formatDistance(getDistance(userPos.lat, userPos.lng, panel.lat, panel.lng))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-background/95 px-3 shadow-lg backdrop-blur"
          >
            <Search className="size-4 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Rechercher un point...</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && (!panels || panels.length === 0) && (
        <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <MapPinOff className="size-5 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-medium">Aucun panneau</p>
          <p className="text-[11px] text-muted-foreground">Les panneaux apparaîtront ici une fois créés</p>
        </div>
      )}

      {/* Legend + recenter — fixed above bottom nav */}
      <div className="fixed left-3 z-10 flex gap-3 rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.75rem)' }}>
        <div className="flex items-center gap-1">
          <CircleCheck className="size-3 text-green-500" />
          <span className="text-[11px]">Libre</span>
        </div>
        <div className="flex items-center gap-1">
          <Megaphone className="size-3 text-red-500" />
          <span className="text-[11px]">Occupé</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="size-3 text-orange-500" />
          <span className="text-[11px]">Problème</span>
        </div>
      </div>

      <button
        onClick={flyToUser}
        disabled={locating}
        aria-label="Recentrer sur ma position"
        className="fixed right-4 z-10 flex size-11 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-colors hover:bg-muted"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        {locating ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <LocateFixed className="size-4" />
        )}
      </button>
    </div>
  )
}
