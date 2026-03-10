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
import { Loader2, Plus, Megaphone, Camera, PanelTop, ChevronRight, MapPin, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PHOTO_TYPE_LABELS: Record<string, string> = {
  installation: 'Installation',
  check: 'Vérification',
  campaign: 'Campagne',
  damage: 'Dégât',
}

const PANEL_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  vacant: 'Vacant',
  maintenance: 'Maintenance',
  missing: 'Manquant',
}

export function OperatorDashboardPage() {
  const { session, profile } = useAuth()
  const { data: panels, isLoading: panelsLoading } = usePanels()

  const { data: recentPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*, panels(reference, status, city)')
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
        .select('*, panels(reference), campaigns(name, client)')
        .eq('assigned_by', session!.user.id)
        .order('assigned_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
    enabled: !!session,
  })

  // Active campaigns with progress
  const { data: activeCampaigns } = useQuery({
    queryKey: ['my-active-campaigns', session?.user.id],
    queryFn: async () => {
      // Get active campaigns
      const { data: campaigns, error: cErr } = await supabase
        .from('campaigns')
        .select('id, name, client, start_date, end_date')
        .eq('status', 'active')
      if (cErr) throw cErr
      if (!campaigns?.length) return []

      // For each campaign, get total assigned panels and how many this operator did
      const results = await Promise.all(
        campaigns.map(async (c) => {
          const [totalRes, myRes] = await Promise.all([
            supabase
              .from('panel_campaigns')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', c.id),
            supabase
              .from('panel_campaigns')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', c.id)
              .eq('assigned_by', session!.user.id),
          ])
          return {
            ...c,
            totalPanels: totalRes.count ?? 0,
            myPanels: myRes.count ?? 0,
          }
        })
      )
      return results
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
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  type ActivityItem = {
    id: string
    type: 'photo' | 'assignment'
    date: string
    panelRef: string
    panelStatus?: string
    detail: string
  }

  const activities: ActivityItem[] = [
    ...(recentPhotos ?? []).map((p) => {
      const panel = (p as Record<string, unknown>).panels as { reference: string; status: string; city: string } | null
      return {
        id: p.id,
        type: 'photo' as const,
        date: p.taken_at,
        panelRef: panel?.reference ?? '—',
        panelStatus: panel?.status,
        detail: PHOTO_TYPE_LABELS[p.photo_type] ?? p.photo_type,
      }
    }),
    ...(recentAssignments ?? []).map((a) => {
      const panel = (a as Record<string, unknown>).panels as { reference: string } | null
      const campaign = (a as Record<string, unknown>).campaigns as { name: string; client: string } | null
      return {
        id: a.id,
        type: 'assignment' as const,
        date: a.assigned_at,
        panelRef: panel?.reference ?? '—',
        detail: campaign?.name ?? '—',
      }
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Greeting */}
      <div>
        <p className="text-[13px] text-muted-foreground">Bonjour,</p>
        <h1 className="text-lg font-semibold tracking-tight">{profile?.full_name || 'Opérateur'}</h1>
      </div>

      {/* KPI row */}
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

      {/* Active campaigns */}
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
                        Campagne en cours
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

                  {/* Progress bar */}
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

                  {/* CTA */}
                  {!isDone && (
                    <Link
                      to="/scan"
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

      {/* Last scanned */}
      {lastPanel && (
        <Card size="sm">
          <CardContent>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Dernier point
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{lastPanel.reference}</p>
                {(lastPanel.city || lastPanel.address) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    <span>{lastPanel.city || lastPanel.address}</span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-[11px]">
                {PANEL_STATUS_LABELS[lastPanel.status] ?? lastPanel.status}
              </Badge>
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
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/scan" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-auto flex-col items-center gap-2 px-3 py-4')}>
          <div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
            <Plus className="size-5" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium">Installer un point</span>
        </Link>
        <Link to="/scan" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-auto flex-col items-center gap-2 px-3 py-4')}>
          <div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
            <Megaphone className="size-5" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium">Diffuser une campagne</span>
        </Link>
      </div>

      <Separator />

      {/* Activity */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium">Activité récente</h2>
          {activities.length > 5 && (
            <Link to="/panels" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              Tout voir <ChevronRight className="size-3" />
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <PanelTop className="size-8" strokeWidth={1} />
            <p className="mt-3 text-sm">Aucune activité</p>
            <Link to="/scan" className="mt-1 text-sm font-medium text-primary hover:underline">
              Commencer à scanner
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {activities.slice(0, 5).map((item) => (
              <div
                key={item.id}
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
                        {PANEL_STATUS_LABELS[item.panelStatus ?? ''] ?? item.panelStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
