import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePanels } from '@/hooks/usePanels'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Megaphone, Camera, PanelTop, ChevronRight, MapPin, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PANEL_STATUS_CONFIG, PHOTO_TYPE_LABELS } from '@/lib/constants'
import type { PanelStatus, PhotoType } from '@/lib/constants'

export function OperatorDashboardPage() {
  const { session, profile } = useAuth()
  const { data: panels, isLoading: panelsLoading } = usePanels()

  const { data: recentPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*, panels(reference, name, status, city)')
        .eq('taken_by', session!.user.id)
        .order('taken_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
    enabled: !!session,
  })

  const { data: recentAssignments, isLoading: assignLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(reference, name), campaigns(name, client)')
        .eq('assigned_by', session!.user.id)
        .order('assigned_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
    enabled: !!session,
  })

  // Active campaigns with progress — 3 queries total instead of 2N+1
  const { data: activeCampaigns } = useQuery({
    queryKey: ['my-active-campaigns', session?.user.id],
    queryFn: async () => {
      // 1. Get active campaigns
      const { data: campaigns, error: cErr } = await supabase
        .from('campaigns')
        .select('id, name, client, start_date, end_date')
        .eq('status', 'active')
      if (cErr) throw cErr
      if (!campaigns?.length) return []

      const campaignIds = campaigns.map((c) => c.id)

      // 2. Get ALL assignments for these campaigns (single query)
      const [allAssignments, myAssignments] = await Promise.all([
        supabase
          .from('panel_campaigns')
          .select('campaign_id')
          .in('campaign_id', campaignIds),
        supabase
          .from('panel_campaigns')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
          .eq('assigned_by', session!.user.id),
      ])

      // 3. Count per campaign in memory
      const totalCounts = new Map<string, number>()
      const myCounts = new Map<string, number>()
      for (const a of allAssignments.data ?? []) {
        totalCounts.set(a.campaign_id, (totalCounts.get(a.campaign_id) ?? 0) + 1)
      }
      for (const a of myAssignments.data ?? []) {
        myCounts.set(a.campaign_id, (myCounts.get(a.campaign_id) ?? 0) + 1)
      }

      return campaigns.map((c) => ({
        ...c,
        totalPanels: totalCounts.get(c.id) ?? 0,
        myPanels: myCounts.get(c.id) ?? 0,
      }))
    },
    enabled: !!session,
  })

  const stats = useMemo(() => {
    if (!panels) return null
    const total = panels.length
    const today = new Date().toISOString().split('T')[0]
    const todayCount = panels.filter((p) => p.created_at?.startsWith(today)).length
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekCount = panels.filter((p) => p.created_at && new Date(p.created_at) >= weekAgo).length
    return { total, todayCount, weekCount }
  }, [panels])

  const lastPanel = useMemo(() => {
    if (!panels?.length) return null
    return panels[0]
  }, [panels])

  const isLoading = panelsLoading || photosLoading || assignLoading

  if (isLoading) {
    return (
      <div className="space-y-5 p-4 pb-20">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="size-7 rounded-md" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  type ActivityItem = {
    id: string
    panelId: string
    type: 'photo' | 'assignment'
    date: string
    panelRef: string
    panelStatus?: string
    detail: string
  }

  const activities: ActivityItem[] = [
    ...(recentPhotos ?? []).map((p) => {
      const panel = (p as Record<string, unknown>).panels as { reference: string; name: string | null; status: string; city: string } | null
      return {
        id: p.id,
        panelId: p.panel_id,
        type: 'photo' as const,
        date: p.taken_at,
        panelRef: panel?.name || panel?.reference || '—',
        panelStatus: panel?.status,
        detail: PHOTO_TYPE_LABELS[p.photo_type as PhotoType] ?? p.photo_type,
      }
    }),
    ...(recentAssignments ?? []).map((a) => {
      const panel = (a as Record<string, unknown>).panels as { reference: string; name: string | null } | null
      const campaign = (a as Record<string, unknown>).campaigns as { name: string; client: string } | null
      return {
        id: a.id,
        panelId: a.panel_id,
        type: 'assignment' as const,
        date: a.assigned_at,
        panelRef: panel?.name || panel?.reference || '—',
        detail: campaign?.name ?? '—',
      }
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-5 p-4 pb-20">
      {/* 1 — Greeting */}
      <div>
        <p className="text-[13px] text-muted-foreground">Bonjour,</p>
        <h1 className="text-lg font-semibold tracking-tight">{profile?.full_name || 'Opérateur'}</h1>
      </div>

      {/* 2 — Action buttons (terrain-first) */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/scan?mode=install" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-auto flex-col items-center gap-2 px-3 py-4')}>
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
            <Plus className="size-5 text-blue-500" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium">Installer</span>
        </Link>
        <Link to="/app/scan?mode=campaign" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-auto flex-col items-center gap-2 px-3 py-4')}>
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
            <Megaphone className="size-5 text-emerald-500" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium">Diffuser</span>
        </Link>
      </div>

      {/* 3 — Active campaign (mission du jour) */}
      {activeCampaigns && activeCampaigns.length > 0 && (
        <div className="space-y-2">
          {activeCampaigns.map((campaign) => {
            const progress = campaign.totalPanels > 0
              ? Math.round((campaign.myPanels / campaign.totalPanels) * 100)
              : 0
            const isDone = campaign.myPanels >= campaign.totalPanels && campaign.totalPanels > 0
            return (
              <Card key={campaign.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        Mission en cours
                      </p>
                      <p className="mt-1 text-sm font-semibold">{campaign.name}</p>
                      <p className="text-[12px] text-muted-foreground">{campaign.client}</p>
                    </div>
                    {isDone ? (
                      <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1">
                        <CheckCircle2 className="size-3 text-green-600" />
                        <span className="text-[11px] font-medium text-green-600">Terminé</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-lg font-bold">{campaign.myPanels}<span className="text-sm font-normal text-muted-foreground">/{campaign.totalPanels}</span></p>
                        <p className="text-[11px] text-muted-foreground">points posés</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isDone ? 'bg-green-500' : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{progress}% complété</span>
                      <span>
                        {new Date(campaign.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' → '}
                        {new Date(campaign.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {!isDone && (
                    <Link
                      to="/app/scan?mode=campaign"
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'w-full gap-1.5'
                      )}
                    >
                      <Megaphone className="size-3.5" />
                      Continuer la diffusion
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 4 — Last point (contexte terrain) */}
      {lastPanel && (
        <Link to={`/app/panels/${lastPanel.id}`} className="block">
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Dernier point
              </p>
              <div className="mt-2 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{lastPanel.name || lastPanel.reference}</p>
                  {(lastPanel.city || lastPanel.address) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <span>{lastPanel.city || lastPanel.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {PANEL_STATUS_CONFIG[lastPanel.status as PanelStatus]?.label ?? lastPanel.status}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground/50" />
                </div>
              </div>
              {lastPanel.created_at && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(lastPanel.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      {/* 5 — Stats (discret, en bas) */}
      <div className="grid grid-cols-3 gap-2">
        <Card size="sm">
          <CardContent className="text-center">
            <p className="text-2xl font-semibold tracking-tight">{stats?.total ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Points total</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-center">
            <p className="text-2xl font-semibold tracking-tight">{stats?.todayCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-center">
            <p className="text-2xl font-semibold tracking-tight">{stats?.weekCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 6 — Activity feed (historique) */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium">Activité récente</h2>
          {activities.length > 5 && (
            <Link to="/app/panels" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              Tout voir <ChevronRight className="size-3" />
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <PanelTop className="size-8" strokeWidth={1} />
            <p className="mt-3 text-sm">Aucune activité</p>
            <Link to="/app/scan" className="mt-1 text-sm font-medium text-primary hover:underline">
              Commencer à scanner
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {activities.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={`/app/panels/${item.panelId}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <div className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md',
                  item.type === 'photo' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                )}>
                  {item.type === 'photo' ? <Camera className="size-3.5" /> : <Megaphone className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium">{item.panelRef}</p>
                    {item.panelStatus && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {PANEL_STATUS_CONFIG[item.panelStatus as PanelStatus]?.label ?? item.panelStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
