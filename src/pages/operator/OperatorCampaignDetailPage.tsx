import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import {
  ArrowLeft,
  Megaphone,
  Calendar,
  MapPin,
  PanelTop,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { PANEL_STATUS_CONFIG } from '@/lib/constants'
import type { PanelStatus } from '@/lib/constants'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  active: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  draft: 'Brouillon',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  draft: 'outline',
}

export function OperatorCampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Campaign data
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, client, description, status, start_date, end_date, target_panel_count, notes')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Campaign visuals
  const { data: visuals } = useQuery({
    queryKey: ['campaign-visuals', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_visuals')
        .select('id, storage_path, file_name')
        .eq('campaign_id', id!)
      if (error) throw error
      return data ?? []
    },
    enabled: !!id,
  })

  // Signed URLs for visuals
  const { data: visualUrls } = useQuery({
    queryKey: ['campaign-visual-urls', visuals?.map((v) => v.id).join(',')],
    queryFn: async () => {
      if (!visuals?.length) return []
      const results = await Promise.allSettled(
        visuals.map(async (v) => {
          const { data } = await supabase.storage
            .from('panel-photos')
            .createSignedUrl(v.storage_path, 3600)
          return { id: v.id, url: data?.signedUrl ?? null, name: v.file_name }
        }),
      )
      return results
        .filter((r): r is PromiseFulfilledResult<{ id: string; url: string | null; name: string }> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((u) => u.url)
    },
    enabled: !!visuals?.length,
    staleTime: 20 * 60 * 1000,
  })

  // All panels for this campaign
  const { data: campaignPanels, isLoading: panelsLoading } = useQuery({
    queryKey: ['campaign-panels', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('panel_id, assigned_by, assigned_at, panels(id, name, reference, status, city, address, zone_label)')
        .eq('campaign_id', id!)
        .is('unassigned_at', null)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!id,
  })

  const totalCount = campaignPanels?.length ?? 0
  const targetCount = campaign?.target_panel_count ?? totalCount
  const progress = targetCount > 0 ? Math.round((totalCount / targetCount) * 100) : 0
  const isDone = targetCount > 0 && totalCount >= targetCount
  const isActive = campaign?.status === 'active'

  // Days remaining
  const daysRemaining = useMemo(() => {
    if (!campaign?.end_date) return null
    const end = new Date(campaign.end_date)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }, [campaign?.end_date])

  if (campaignLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="size-5" />
          </button>
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-4 p-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Megaphone className="size-8 text-muted-foreground" strokeWidth={1} />
        <p className="mt-3 text-lg font-medium">Campagne non trouvée</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary underline">
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate('/app/panels?tab=campaigns')} aria-label="Retour">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{campaign.name}</h1>
        </div>
        <Badge variant={STATUS_VARIANTS[campaign.status] ?? 'secondary'} className="shrink-0 text-[10px]">
          {STATUS_LABELS[campaign.status] ?? campaign.status}
        </Badge>
      </div>

      <div className="space-y-4 p-4">
        {/* Campaign info */}
        <Card>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[14px] font-semibold">{campaign.name}</p>
              <p className="text-[12px] text-muted-foreground">{campaign.client}</p>
            </div>

            {campaign.description && (
              <p className="text-[13px] text-muted-foreground">{campaign.description}</p>
            )}

            {/* Dates */}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>
                {new Date(campaign.start_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {' → '}
                {new Date(campaign.end_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Urgency badge */}
            {isActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900/30 dark:bg-orange-950/20">
                <Clock className="size-3.5 text-orange-500" />
                <span className="text-[12px] font-medium text-orange-600 dark:text-orange-400">
                  Expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {isActive && daysRemaining !== null && daysRemaining <= 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/30 dark:bg-red-950/20">
                <AlertTriangle className="size-3.5 text-red-500" />
                <span className="text-[12px] font-medium text-red-600 dark:text-red-400">
                  Campagne expirée
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Progression
              </p>
              {isDone && (
                <span className="text-[11px] font-medium text-green-600">Terminé</span>
              )}
            </div>
            <div>
              <p className="text-3xl font-bold">
                {totalCount}
                <span className="text-lg font-normal text-muted-foreground">/{targetCount}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">points posés</p>
            </div>
            <div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isDone ? 'bg-green-500' : 'bg-primary',
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{progress}% complété</p>
            </div>
          </CardContent>
        </Card>

        {/* Visuals */}
        {visualUrls && visualUrls.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <ImageIcon className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Visuels ({visualUrls.length})
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visualUrls.map((v) => (
                <button
                  key={v.id}
                  onClick={() => v.url && window.open(v.url, '_blank')}
                  className="shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={v.url!}
                    alt={v.name ?? 'Visuel campagne'}
                    className="h-32 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes / consignes */}
        {campaign.notes && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Consignes
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-[13px]">{campaign.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* My panels for this campaign */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <PanelTop className="size-3.5 text-muted-foreground" />
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Panneaux de la campagne ({totalCount})
            </p>
          </div>

          {panelsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !campaignPanels?.length ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <PanelTop className="size-6" strokeWidth={1} />
              <p className="mt-2 text-[13px]">Aucun panneau posé</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {campaignPanels.map((assignment) => {
                const panel = (assignment as Record<string, unknown>).panels as {
                  id: string
                  name: string | null
                  reference: string
                  status: string
                  city: string | null
                  address: string | null
                  zone_label: string | null
                } | null
                if (!panel) return null
                const statusCfg = PANEL_STATUS_CONFIG[panel.status as PanelStatus]
                return (
                  <Link
                    key={panel.id}
                    to={`/app/panels/${panel.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors active:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium">
                          {panel.name || 'Panneau'}
                        </p>
                        <Badge
                          variant={statusCfg?.variant ?? 'secondary'}
                          className="text-[10px] font-normal"
                        >
                          {statusCfg?.label ?? panel.status}
                        </Badge>
                      </div>
                      {(panel.city || panel.address) && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3" />
                          <span className="truncate">{panel.zone_label ? `${panel.zone_label} · ${panel.city}` : (panel.city || panel.address)}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed CTA */}
      {isActive && !isDone && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link
            to={`/app/scan?mode=campaign&campaign=${campaign.id}`}
            className={cn(buttonVariants(), 'w-full gap-1.5')}
          >
            <Megaphone className="size-4" />
            Continuer la diffusion
          </Link>
        </div>
      )}
    </div>
  )
}
