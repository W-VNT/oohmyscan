import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import { usePanels } from '@/hooks/usePanels'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Filter, Loader2, Locate } from 'lucide-react'
import { PANEL_STATUSES, PANEL_STATUS_COLORS, type PanelStatus } from '@/lib/constants'
import type { Panel } from '@/types'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Default center: Paris
const DEFAULT_VIEW = { longitude: 2.3522, latitude: 48.8566, zoom: 5 }

export function MapPage() {
  const { data: panels, isLoading } = usePanels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null)

  const statusFilter = searchParams.get('status') as PanelStatus | null
  const cityFilter = searchParams.get('city')

  const filteredPanels = useMemo(() => {
    if (!panels) return []
    return panels.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (cityFilter && p.city !== cityFilter) return false
      return true
    })
  }, [panels, statusFilter, cityFilter])

  const cities = useMemo(() => {
    if (!panels) return []
    const set = new Set(panels.map((p) => p.city).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [panels])

  const [viewState, setViewState] = useState(DEFAULT_VIEW)

  const handleCenterOnPanels = useCallback(() => {
    if (!filteredPanels.length) return
    const lats = filteredPanels.map((p) => p.lat)
    const lngs = filteredPanels.map((p) => p.lng)
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    setViewState({ latitude: centerLat, longitude: centerLng, zoom: 10 })
  }, [filteredPanels])

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Carte</h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
          <p className="text-lg font-medium">Token Mapbox manquant</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoutez VITE_MAPBOX_TOKEN dans .env.local pour activer la carte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Carte</h2>
        <span className="text-sm text-muted-foreground">
          {filteredPanels.length} panneau{filteredPanels.length !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setFilter('status', e.target.value || null)}
            className="flex h-9 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-1 text-sm"
          >
            <option value="">Tous les statuts</option>
            {PANEL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <select
          value={cityFilter ?? ''}
          onChange={(e) => setFilter('city', e.target.value || null)}
          className="flex h-9 appearance-none rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={handleCenterOnPanels}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm transition-colors hover:bg-accent"
        >
          <Locate className="h-4 w-4" />
          Centrer
        </button>
      </div>

      {/* Map */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border" style={{ height: 'calc(100vh - 260px)' }}>
          <Map
            {...viewState}
            onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {filteredPanels.map((panel) => (
              <Marker
                key={panel.id}
                longitude={panel.lng}
                latitude={panel.lat}
                anchor="center"
                onClick={(e: { originalEvent: MouseEvent }) => {
                  e.originalEvent.stopPropagation()
                  setSelectedPanel(panel)
                }}
              >
                <div
                  className="h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
                  style={{
                    backgroundColor: PANEL_STATUS_COLORS[panel.status as PanelStatus] ?? '#6b7280',
                  }}
                />
              </Marker>
            ))}

            {selectedPanel && (
              <Popup
                longitude={selectedPanel.lng}
                latitude={selectedPanel.lat}
                anchor="bottom"
                onClose={() => setSelectedPanel(null)}
                closeButton={true}
                closeOnClick={false}
                className="[&_.mapboxgl-popup-content]:rounded-lg [&_.mapboxgl-popup-content]:bg-card [&_.mapboxgl-popup-content]:p-0 [&_.mapboxgl-popup-content]:shadow-lg"
              >
                <div className="min-w-48 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{selectedPanel.reference}</p>
                    <StatusBadge status={selectedPanel.status as PanelStatus} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedPanel.name || selectedPanel.address || '—'}
                  </p>
                  {selectedPanel.city && (
                    <p className="text-xs text-muted-foreground">{selectedPanel.city}</p>
                  )}
                  <Link
                    to={`/admin/panels/${selectedPanel.id}`}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    Voir la fiche →
                  </Link>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}
    </div>
  )
}
