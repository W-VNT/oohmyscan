import { useParams, Link } from 'react-router-dom'
import { usePanel } from '@/hooks/usePanels'
import { QRCode } from '@/components/qr/QRCode'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  Megaphone,
} from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'
import type { PanelPhoto, PanelCampaign } from '@/types'

export function PanelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: panel, isLoading } = usePanel(id)

  const { data: photos } = useQuery({
    queryKey: ['panel-photos', id],
    queryFn: async (): Promise<PanelPhoto[]> => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*')
        .eq('panel_id', id!)
        .order('taken_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: assignments } = useQuery({
    queryKey: ['panel-campaigns', id],
    queryFn: async (): Promise<(PanelCampaign & { campaign_name?: string })[]> => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, campaigns(name, client)')
        .eq('panel_id', id!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingScreen />

  if (!panel) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Panneau non trouvé</p>
        <Link to="/admin/panels" className="mt-4 text-sm text-primary underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  function getPhotoUrl(storagePath: string) {
    const { data } = supabase.storage.from('panel-photos').getPublicUrl(storagePath)
    return data.publicUrl
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/panels"
            className="rounded-md p-1 transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{panel.reference}</h2>
              <StatusBadge status={panel.status as PanelStatus} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {panel.name || 'Sans nom'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Informations</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Coordonnées" value={`${panel.lat.toFixed(6)}, ${panel.lng.toFixed(6)}`} />
              <InfoRow icon={MapPin} label="Adresse" value={panel.address || '—'} />
              <InfoRow icon={MapPin} label="Ville" value={panel.city || '—'} />
              <InfoRow icon={Calendar} label="Format" value={panel.format || '—'} />
              <InfoRow icon={Calendar} label="Type" value={panel.type || '—'} />
              <InfoRow icon={Calendar} label="Installé le" value={panel.installed_at ? new Date(panel.installed_at).toLocaleDateString('fr-FR') : '—'} />
              <InfoRow icon={Calendar} label="Dernière vérification" value={panel.last_checked_at ? new Date(panel.last_checked_at).toLocaleDateString('fr-FR') : '—'} />
            </div>
            {panel.notes && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">{panel.notes}</p>
              </div>
            )}
          </div>

          {/* Campaign history */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <h3 className="font-semibold">Historique campagnes</h3>
            </div>
            {!assignments?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune campagne assignée</p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assignments.map((a) => {
                  const campaign = (a as Record<string, unknown>).campaigns as { name: string; client: string } | null
                  return (
                    <div key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {campaign?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {campaign?.client ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.assigned_at).toLocaleDateString('fr-FR')}
                        </p>
                        {a.unassigned_at ? (
                          <span className="text-xs text-muted-foreground">
                            → {new Date(a.unassigned_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600">En cours</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Photos gallery */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <h3 className="font-semibold">Photos ({photos?.length ?? 0})</h3>
            </div>
            {!photos?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune photo</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <img
                      src={getPhotoUrl(photo.storage_path)}
                      alt={photo.photo_type}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-2 py-1">
                      <p className="text-xs text-white">{photo.photo_type}</p>
                      <p className="text-xs text-white/70">
                        {new Date(photo.taken_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — QR Code */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">QR Code</h3>
            <div className="flex justify-center">
              <QRCode panelId={panel.qr_code} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}
