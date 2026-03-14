import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfinitePanels } from '@/hooks/usePanels'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelTop, Search, MapPin, ChevronRight, Loader2, Megaphone, CheckCircle2 } from 'lucide-react'
import { PANEL_STATUS_CONFIG } from '@/lib/constants'
import type { PanelStatus } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PullToRefresh } from '@/components/shared/PullToRefresh'

type Tab = 'panels' | 'campaigns'

interface CampaignWithStats {
  id: string
  name: string
  client: string
  status: string
  start_date: string
  end_date: string
  target_panel_count: number | null
  totalPanels: number
}

export function OperatorPanelsPage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') === 'campaigns' ? 'campaigns' : 'panels'))
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search to avoid spamming Supabase
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // ─── Panels data ───
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitePanels(debouncedSearch)

  const panels = data?.pages.flat() ?? []
  const totalCount = panels.length + (hasNextPage ? '+' : '')

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [handleObserver])

  // ─── Campaigns data ───
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['my-campaigns-list', session?.user.id],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('panel_campaigns')
        .select('campaign_id')
        .eq('assigned_by', session!.user.id)
      if (error) throw error
      if (!assignments?.length) return []

      const campaignIds = [...new Set(assignments.map((a) => a.campaign_id))]

      const { data: campaignData, error: cErr } = await supabase
        .from('campaigns')
        .select('id, name, client, status, start_date, end_date, target_panel_count')
        .in('id', campaignIds)
        .order('start_date', { ascending: false })
      if (cErr) throw cErr
      if (!campaignData?.length) return []

      const results: CampaignWithStats[] = await Promise.all(
        campaignData.map(async (c) => {
          const totalRes = await supabase
            .from('panel_campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', c.id)
            .is('unassigned_at', null)
          return {
            ...c,
            totalPanels: totalRes.count ?? 0,
          }
        }),
      )
      return results
    },
    enabled: !!session,
  })

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4 p-4 pb-20">
      {/* Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('panels')}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
            tab === 'panels'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground'
          )}
        >
          <PanelTop className="size-3.5" />
          Panneaux
        </button>
        <button
          onClick={() => setTab('campaigns')}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
            tab === 'campaigns'
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground'
          )}
        >
          <Megaphone className="size-3.5" />
          Campagnes
        </button>
      </div>

      {/* ─── Tab: Panneaux ─── */}
      {tab === 'panels' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Panneaux</h1>
            <span className="text-xs text-muted-foreground">{totalCount} points</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un point..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-base"
            />
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="size-4 rounded" />
                </div>
              ))}
            </div>
          ) : !panels.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <PanelTop className="size-8" strokeWidth={1} />
              <p className="mt-3 text-sm">{search ? 'Aucun résultat' : 'Aucun panneau enregistré'}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {panels.map((panel) => {
                const cfg = PANEL_STATUS_CONFIG[panel.status as PanelStatus]
                return (
                  <Link
                    key={panel.id}
                    to={`/app/panels/${panel.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium">{(panel as any).locations?.name || panel.name || 'Panneau'}</p>
                        <Badge variant={cfg?.variant ?? 'secondary'} className="text-[10px] font-normal">
                          {cfg?.label ?? panel.status}
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

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-4 text-center">
                {isFetchingNextPage && (
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Campagnes ─── */}
      {tab === 'campaigns' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Mes campagnes</h1>
            <span className="text-xs text-muted-foreground">{campaigns?.length ?? 0} campagnes</span>
          </div>

          {campaignsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : !campaigns?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Megaphone className="size-8" strokeWidth={1} />
              <p className="mt-3 text-sm">Aucune campagne</p>
              <p className="text-[12px]">Vos campagnes apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const targetCount = campaign.target_panel_count ?? campaign.totalPanels
                const progress =
                  targetCount > 0
                    ? Math.round((campaign.totalPanels / targetCount) * 100)
                    : 0
                const isDone = targetCount > 0 && campaign.totalPanels >= targetCount

                return (
                  <Link
                    key={campaign.id}
                    to={`/app/campaigns/${campaign.id}`}
                    className="block"
                  >
                    <Card>
                      <CardContent className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold">{campaign.name}</p>
                            <p className="text-[12px] text-muted-foreground">{campaign.client}</p>
                          </div>
                          {isDone ? (
                            <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1">
                              <CheckCircle2 className="size-3 text-green-600" />
                              <span className="text-[11px] font-medium text-green-600">Terminé</span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {campaign.totalPanels}
                                <span className="text-sm font-normal text-muted-foreground">
                                  /{targetCount}
                                </span>
                              </p>
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
                                isDone ? 'bg-green-500' : 'bg-primary',
                              )}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{progress}% complété</span>
                            <span>
                              {new Date(campaign.start_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {' → '}
                              {new Date(campaign.end_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  )
}
