import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { PANEL_STATUS_COLORS, type PanelStatus } from '@/lib/constants'
import { Loader2, LocateFixed, Navigation, Eye, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Panel } from '@/types'
import Map, { Marker, Popup } from 'react-map-gl/mapbox'
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
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

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
          p.address?.toLowerCase().includes(q)
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

  // Campaign indicator
  const [panelCampaigns, setPanelCampaigns] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!panels?.length) return
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('panel_campaigns')
        .select('panel_id')
        .is('unassigned_at', null)
        .then(({ data }) => {
          if (data) {
            setPanelCampaigns(new Set(data.map((d) => d.panel_id)))
          }
        })
    })
  }, [panels])

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
        onClick={() => setSelectedPanel(null)}
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

        {/* Panel markers */}
        {(panels ?? []).map((panel) => {
          const hasCampaign = panelCampaigns.has(panel.id)
          return (
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
              <div className="relative">
                <div
                  className="size-4 cursor-pointer rounded-full border-2 border-white shadow-md"
                  style={{
                    backgroundColor: PANEL_STATUS_COLORS[panel.status as PanelStatus] ?? '#6b7280',
                  }}
                />
                {hasCampaign && (
                  <div className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-400 ring-1 ring-white" />
                )}
              </div>
            </Marker>
          )
        })}

        {/* Enriched popup */}
        {selectedPanel && (
          <Popup
            longitude={selectedPanel.lng}
            latitude={selectedPanel.lat}
            anchor="bottom"
            onClose={() => setSelectedPanel(null)}
            closeButton={false}
            closeOnClick={false}
            offset={12}
          >
            <div className="min-w-48 space-y-2.5 p-1">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{selectedPanel.reference}</p>
                  <Badge
                    variant={
                      ({ active: 'default', vacant: 'secondary', maintenance: 'outline', missing: 'destructive' } as const)[
                        selectedPanel.status as PanelStatus
                      ] ?? 'secondary'
                    }
                    className="text-[10px]"
                  >
                    {{ active: 'Actif', vacant: 'Vacant', maintenance: 'Maintenance', missing: 'Manquant' }[selectedPanel.status] ?? selectedPanel.status}
                  </Badge>
                </div>
                {(selectedPanel.name || selectedPanel.city) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedPanel.name}{selectedPanel.name && selectedPanel.city ? ' · ' : ''}{selectedPanel.city}
                  </p>
                )}
                {distanceToSelected !== null && (
                  <p className="mt-0.5 text-[11px] font-medium text-blue-500">
                    à {formatDistance(distanceToSelected)}
                  </p>
                )}
              </div>

              <div className="flex gap-1.5">
                <Link
                  to={`/panels/${selectedPanel.id}`}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'h-7 flex-1 gap-1 text-[11px]'
                  )}
                >
                  <Eye className="size-3" />
                  Voir
                </Link>
                <button
                  onClick={() => openDirections(selectedPanel.lat, selectedPanel.lng)}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'sm' }),
                    'h-7 flex-1 gap-1 text-[11px]'
                  )}
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
      <div className="absolute left-3 right-3 top-3">
        {showSearch ? (
          <div className="rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un point..."
                className="h-10 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearch('') }}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-border">
                {searchResults.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => flyToPanel(panel)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PANEL_STATUS_COLORS[panel.status as PanelStatus] ?? '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{panel.reference}</p>
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
