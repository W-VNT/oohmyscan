import { useState, useEffect, useCallback } from 'react'
import { usePanels } from '@/hooks/usePanels'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PANEL_STATUS_COLORS, type PanelStatus } from '@/lib/constants'
import { Loader2, LocateFixed } from 'lucide-react'
import type { Panel } from '@/types'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Zoom ~16 ≈ 200m radius view
const USER_ZOOM = 16

export function OperatorMapPage() {
  const { data: panels, isLoading } = usePanels()
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 12,
  })
  const [userPos, setUserPos] = useState<{ lng: number; lat: number } | null>(null)
  const [locating, setLocating] = useState(true)

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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    flyToUser()
  }, [flyToUser])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center" style={{ height: 'calc(100vh - 4rem)' }}>
        <p className="text-lg font-medium">Carte non disponible</p>
        <p className="mt-2 text-sm text-muted-foreground">Token Mapbox manquant</p>
      </div>
    )
  }

  if (isLoading && locating) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 4rem)' }} className="relative">
      <Map
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
      >
        {/* User position marker */}
        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute size-8 animate-ping rounded-full bg-blue-500/20" />
              <div className="size-3.5 rounded-full border-2 border-white bg-blue-500 shadow-md" />
            </div>
          </Marker>
        )}

        {/* Panel markers */}
        {(panels ?? []).map((panel) => (
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
              className="h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow-md"
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
          >
            <div className="min-w-40 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{selectedPanel.reference}</p>
                <StatusBadge status={selectedPanel.status as PanelStatus} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPanel.name || '—'}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Re-center button */}
      <button
        onClick={flyToUser}
        disabled={locating}
        className="absolute bottom-6 right-4 flex size-10 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-colors hover:bg-muted"
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
