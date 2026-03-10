import { usePanels } from '@/hooks/usePanels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  PanelTop,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'

export function DashboardPage() {
  const { data: panels, isLoading: panelsLoading } = usePanels()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()

  if (panelsLoading || campaignsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const total = panels?.length ?? 0
  const active = panels?.filter((p) => p.status === 'active').length ?? 0
  const vacant = panels?.filter((p) => p.status === 'vacant').length ?? 0
  const missing = panels?.filter((p) => p.status === 'missing').length ?? 0
  const maintenance = panels?.filter((p) => p.status === 'maintenance').length ?? 0
  const occupationRate = total > 0 ? Math.round((active / total) * 100) : 0
  const activeCampaigns = campaigns?.filter((c) => c.status === 'active').length ?? 0

  const stats = [
    {
      label: 'Total panneaux',
      value: total,
      icon: PanelTop,
      color: 'text-foreground',
    },
    {
      label: 'Taux d\'occupation',
      value: `${occupationRate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Campagnes actives',
      value: activeCampaigns,
      icon: Megaphone,
      color: 'text-blue-600',
    },
    {
      label: 'Panneaux manquants',
      value: missing,
      icon: AlertTriangle,
      color: missing > 0 ? 'text-red-600' : 'text-muted-foreground',
    },
  ]

  // Recent panels (last 10 updated)
  const recentPanels = [...(panels ?? [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Répartition par statut</h3>
        <div className="mt-4 space-y-3">
          {[
            { status: 'active' as const, count: active, label: 'Actifs' },
            { status: 'vacant' as const, count: vacant, label: 'Vacants' },
            { status: 'maintenance' as const, count: maintenance, label: 'Maintenance' },
            { status: 'missing' as const, count: missing, label: 'Manquants' },
          ].map(({ status, count }) => (
            <div key={status} className="flex items-center gap-3">
              <StatusBadge status={status} />
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      status === 'active'
                        ? 'bg-green-500'
                        : status === 'vacant'
                        ? 'bg-gray-400'
                        : status === 'maintenance'
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Activité récente</h3>
        {recentPanels.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune activité</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {recentPanels.map((panel) => (
              <div
                key={panel.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium">{panel.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {panel.name || panel.city || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={panel.status as PanelStatus} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(panel.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
