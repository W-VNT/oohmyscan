import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePanels } from '@/hooks/usePanels'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Loader2, PanelTop, ScanLine, Camera, Megaphone, ArrowRight } from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'

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

  const stats = useMemo(() => {
    if (!panels) return null

    const total = panels.length
    const byStatus: Record<string, number> = {}
    panels.forEach((p) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    })

    // Today's date
    const today = new Date().toISOString().split('T')[0]
    const todayCount = panels.filter(
      (p) => p.created_at && p.created_at.startsWith(today)
    ).length

    // This week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekCount = panels.filter(
      (p) => p.created_at && new Date(p.created_at) >= weekAgo
    ).length

    return { total, byStatus, todayCount, weekCount }
  }, [panels])

  // Last scanned panel (most recently created/updated)
  const lastPanel = useMemo(() => {
    if (!panels?.length) return null
    return panels[0] // Already sorted by created_at desc
  }, [panels])

  const isLoading = panelsLoading || photosLoading || assignLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Merge recent activity
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
        detail: p.photo_type === 'installation' ? 'Installation' : p.photo_type === 'check' ? 'Vérification' : p.photo_type === 'campaign' ? 'Campagne' : 'Dégât',
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
    <div className="space-y-5 p-4">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Bonjour,</p>
        <h1 className="text-xl font-bold">{profile?.full_name || 'Opérateur'}</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Points total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.todayCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">Aujourd'hui</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.weekCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>
      </div>

      {/* Status breakdown */}
      {stats && Object.keys(stats.byStatus).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <StatusBadge status={status as PanelStatus} />
              <span className="text-sm font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Last scanned panel */}
      {lastPanel && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dernier point scanné</p>
            <ScanLine className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{lastPanel.reference}</p>
              <p className="text-sm text-muted-foreground">{lastPanel.city || lastPanel.address || '—'}</p>
            </div>
            <StatusBadge status={lastPanel.status as PanelStatus} />
          </div>
          {lastPanel.created_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(lastPanel.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/scan"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors active:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanLine className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Scanner</span>
        </Link>
        <Link
          to="/panels"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors active:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PanelTop className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Mes points</span>
        </Link>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Activité récente</h2>
          {activities.length > 5 && (
            <Link to="/panels" className="flex items-center gap-1 text-xs text-primary">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="mt-4 flex flex-col items-center py-10 text-muted-foreground">
            <PanelTop className="h-10 w-10" />
            <p className="mt-3 text-sm">Aucune activité récente</p>
            <Link to="/scan" className="mt-2 text-sm font-medium text-primary">
              Commencer à scanner
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {activities.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  item.type === 'photo' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                }`}>
                  {item.type === 'photo' ? <Camera className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.panelRef}</p>
                    {item.panelStatus && (
                      <StatusBadge status={item.panelStatus as PanelStatus} />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
