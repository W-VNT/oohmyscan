import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLocation as useLocationData, useLocationPanels, useLocationContract } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, MapPin, Phone, Mail, PanelTop, FileCheck, Download, Loader2,
  User as UserIcon, Camera, Plus, Navigation2, Clock, Megaphone,
} from 'lucide-react'
import { PANEL_ZONES, PANEL_STATUS_CONFIG } from '@/lib/constants'
import type { PanelStatus } from '@/lib/constants'
import { isValidUUID } from '@/lib/utils'
import { useEffect, useState } from 'react'

/** Renvoie "il y a X" (jours, heures, minutes) pour une date ISO. */
function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  const m = Math.floor(d / 30)
  if (m < 12) return `il y a ${m} mois`
  return `il y a ${Math.floor(m / 12)} an${m >= 24 ? 's' : ''}`
}

function zoneLabel(zone: string | null, fallback: string): string {
  if (!zone) return fallback
  if (zone.startsWith('custom:')) return zone.slice(7)
  return PANEL_ZONES.find((z) => z.value === zone)?.label ?? zone
}

export function OperatorLocationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const validId = isValidUUID(id) ? id : undefined
  const { data: location, isLoading } = useLocationData(validId)
  const { data: panels } = useLocationPanels(validId)
  const { data: contract } = useLocationContract(validId)

  // Photos : recupere la 1ere photo "installation" pour chaque panneau (thumb)
  const panelIds = (panels ?? []).map((p) => p.id)
  const { data: panelPhotos } = useQuery({
    queryKey: ['location-panel-photos', validId, panelIds.join(',')],
    queryFn: async () => {
      if (panelIds.length === 0) return {}
      const { data } = await supabase
        .from('panel_photos')
        .select('panel_id, storage_path, photo_type, taken_at')
        .in('panel_id', panelIds)
        .order('taken_at', { ascending: false })
      if (!data) return {}
      const map: Record<string, string> = {}
      // Prend la 1ere photo installation par panneau, sinon la plus recente
      for (const p of data) {
        if (map[p.panel_id]) continue
        map[p.panel_id] = p.storage_path
      }
      // Deuxieme passe : priorise les photos "installation" si dispo
      for (const p of data) {
        if (p.photo_type === 'installation') map[p.panel_id] = p.storage_path
      }
      return map
    },
    enabled: panelIds.length > 0,
  })

  // Signed URLs pour les thumbs
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!panelPhotos) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        Object.entries(panelPhotos).map(async ([panelId, path]) => {
          const { data } = await supabase.storage
            .from('panel-photos')
            .createSignedUrl(path, 3600)
          return [panelId, data?.signedUrl ?? ''] as const
        }),
      )
      if (cancelled) return
      setThumbUrls(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [panelPhotos])

  // Activite recente : photos + depots des campagnes
  const { data: activity } = useQuery({
    queryKey: ['location-activity', validId],
    queryFn: async () => {
      if (panelIds.length === 0) return []
      // Photos recentes des panneaux de ce lieu
      const { data: photos } = await supabase
        .from('panel_photos')
        .select('id, panel_id, photo_type, taken_at, taken_by')
        .in('panel_id', panelIds)
        .order('taken_at', { ascending: false })
        .limit(10)
      // Campagnes recemment posees sur ces panneaux
      const { data: campaigns } = await supabase
        .from('panel_campaigns')
        .select('id, panel_id, campaign_id, assigned_at, campaigns(name)')
        .in('panel_id', panelIds)
        .order('assigned_at', { ascending: false })
        .limit(10)

      const items: Array<{ id: string; kind: 'photo' | 'campaign'; date: string; label: string; subLabel: string }> = []
      for (const p of (photos ?? [])) {
        items.push({
          id: `photo-${p.id}`,
          kind: 'photo',
          date: p.taken_at,
          label: p.photo_type === 'installation' ? 'Installation' : p.photo_type === 'campaign' ? 'Pose campagne' : 'Contrôle',
          subLabel: relativeTime(p.taken_at),
        })
      }
      for (const c of (campaigns ?? []) as unknown as Array<{ id: string; campaign_id: string; assigned_at: string; campaigns: { name: string } | null }>) {
        items.push({
          id: `camp-${c.id}`,
          kind: 'campaign',
          date: c.assigned_at,
          label: `Campagne : ${c.campaigns?.name ?? '—'}`,
          subLabel: relativeTime(c.assigned_at),
        })
      }
      return items
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6)
    },
    enabled: panelIds.length > 0,
  })

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Identifiant de lieu invalide</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary underline">Retour</button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-medium">Lieu non trouvé</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary underline">
          Retour
        </button>
      </div>
    )
  }

  // Lien Maps universel (Apple Maps sur iOS, Google Maps ailleurs)
  const mapsQuery = encodeURIComponent(
    `${location.name}, ${location.address}, ${location.postal_code} ${location.city}`,
  )
  const mapsHref = `https://maps.apple.com/?q=${mapsQuery}`

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+9rem)]">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Retour" className="rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="truncate text-[15px] font-semibold">{location.name}</h1>
      </div>

      <div className="space-y-4 p-4">
        {/* Address */}
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted/50"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <MapPin className="size-4 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{location.address}</p>
            <p className="text-[12px] text-muted-foreground">
              {location.postal_code} {location.city}
            </p>
          </div>
          <Navigation2 className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </a>

        {/* Contact — bailleur + tel + email */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-start gap-3 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserIcon className="size-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">
                {location.owner_first_name} {location.owner_last_name}
              </p>
              <p className="text-[11px] text-muted-foreground">{location.owner_role || 'Gérant'}</p>
            </div>
          </div>
          {(location.phone || location.owner_email) && (
            <div className="border-t border-border">
              {location.phone && (
                <a
                  href={`tel:${location.phone}`}
                  className="flex items-center gap-3 p-3 transition-colors active:bg-muted/50"
                >
                  <Phone className="size-4 shrink-0 text-emerald-600" />
                  <span className="flex-1 text-[13px] text-foreground">{location.phone}</span>
                  <span className="text-[11px] font-medium text-emerald-600">Appeler</span>
                </a>
              )}
              {location.phone && location.owner_email && (
                <div className="mx-3 border-t border-border" />
              )}
              {location.owner_email && (
                <a
                  href={`mailto:${location.owner_email}`}
                  className="flex items-center gap-3 p-3 transition-colors active:bg-muted/50"
                >
                  <Mail className="size-4 shrink-0 text-blue-600" />
                  <span className="flex-1 truncate text-[13px] text-foreground">{location.owner_email}</span>
                  <span className="text-[11px] font-medium text-blue-600">Écrire</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Contract */}
        {contract && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <FileCheck className="size-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">Contrat {contract.contract_number}</p>
                <p className="text-[11px] text-muted-foreground">
                  Signé le {new Date(contract.signed_at).toLocaleDateString('fr-FR')}
                  {contract.signed_city && ` à ${contract.signed_city}`}
                </p>
              </div>
              {contract.storage_path && (
                <button
                  onClick={async () => {
                    const { data, error } = await supabase.storage
                      .from('panel-photos')
                      .createSignedUrl(contract.storage_path!, 3600)
                    if (error || !data?.signedUrl) return
                    window.open(data.signedUrl, '_blank')
                  }}
                  className="rounded-md p-2 text-primary transition-colors active:bg-muted/50"
                  aria-label="Voir le PDF"
                >
                  <Download className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Panneaux */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Panneaux ({panels?.length ?? 0})
            </p>
          </div>
          <div className="space-y-2">
            {panels?.map((panel) => {
              const status = PANEL_STATUS_CONFIG[panel.status as PanelStatus]
              const thumb = thumbUrls[panel.id]
              return (
                <Link
                  key={panel.id}
                  to={`/app/panels/${panel.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 transition-colors active:bg-muted/50"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {thumb ? (
                      <img src={thumb} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <PanelTop className="size-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {zoneLabel(panel.zone_label, panel.reference)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{panel.reference}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      Contrôle {relativeTime(panel.last_checked_at)}
                    </p>
                  </div>
                  <div className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status?.bg ?? ''}`}>
                    {status?.label ?? panel.status}
                  </div>
                </Link>
              )
            })}
            {(!panels || panels.length === 0) && (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                Aucun panneau rattaché
              </p>
            )}
          </div>
        </div>

        {/* Activite recente */}
        {activity && activity.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Activité récente
            </p>
            <div className="rounded-xl border border-border bg-card">
              {activity.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 ${idx < activity.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    item.kind === 'photo' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {item.kind === 'photo' ? (
                      <Camera className="size-3.5 text-blue-600" />
                    ) : (
                      <Megaphone className="size-3.5 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.subLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky actions terrain */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-[13px] font-medium text-foreground transition-colors active:bg-muted/50"
          >
            <Navigation2 className="size-4 text-emerald-600" />
            Itinéraire
          </a>
          <button
            onClick={() => navigate(`/app/scan?mode=install`)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-3 text-[13px] font-medium text-background transition-colors active:opacity-90"
          >
            <Plus className="size-4" />
            Ajouter un panneau
          </button>
        </div>
      </div>
    </div>
  )
}

