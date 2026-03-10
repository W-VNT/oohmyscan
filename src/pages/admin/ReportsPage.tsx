import { useMemo } from 'react'
import { usePanels } from '@/hooks/usePanels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Download, Loader2, PanelTop, Megaphone, TrendingUp, AlertTriangle } from 'lucide-react'
export function ReportsPage() {
  const { data: panels, isLoading: panelsLoading } = usePanels()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()

  const stats = useMemo(() => {
    if (!panels) return null
    const total = panels.length
    const byStatus = {
      active: panels.filter((p) => p.status === 'active').length,
      vacant: panels.filter((p) => p.status === 'vacant').length,
      missing: panels.filter((p) => p.status === 'missing').length,
      maintenance: panels.filter((p) => p.status === 'maintenance').length,
    }
    const occupationRate = total > 0 ? ((byStatus.active / total) * 100).toFixed(1) : '0'

    // Panels not checked in 30+ days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const unchecked = panels.filter((p) => {
      if (!p.last_checked_at) return true
      return new Date(p.last_checked_at) < thirtyDaysAgo
    })

    // By city
    const byCity: Record<string, { total: number; active: number }> = {}
    panels.forEach((p) => {
      const city = p.city || 'Non renseigné'
      if (!byCity[city]) byCity[city] = { total: 0, active: 0 }
      byCity[city].total++
      if (p.status === 'active') byCity[city].active++
    })

    // By format
    const byFormat: Record<string, number> = {}
    panels.forEach((p) => {
      const format = p.format || 'Non renseigné'
      byFormat[format] = (byFormat[format] || 0) + 1
    })

    return { total, byStatus, occupationRate, unchecked, byCity, byFormat }
  }, [panels])

  const campaignStats = useMemo(() => {
    if (!campaigns) return null
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
    }
  }, [campaigns])

  function exportCSV() {
    if (!panels) return
    const headers = ['reference', 'name', 'status', 'city', 'format', 'type', 'lat', 'lng', 'installed_at', 'last_checked_at']
    const rows = panels.map((p) =>
      headers.map((h) => {
        const val = p[h as keyof typeof p]
        return val != null ? String(val) : ''
      })
    )
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `oohmyscan-panneaux-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (panelsLoading || campaignsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rapports</h2>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={PanelTop} label="Total panneaux" value={String(stats?.total ?? 0)} />
        <KPICard icon={TrendingUp} label="Taux d'occupation" value={`${stats?.occupationRate ?? 0}%`} color="text-green-600" />
        <KPICard icon={Megaphone} label="Campagnes actives" value={String(campaignStats?.active ?? 0)} color="text-blue-600" />
        <KPICard icon={AlertTriangle} label="Non vérifiés (30j)" value={String(stats?.unchecked?.length ?? 0)} color={(stats?.unchecked?.length ?? 0) > 0 ? 'text-orange-600' : undefined} />
      </div>

      {/* Status distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Répartition par statut</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { status: 'active', label: 'Actifs', color: 'bg-green-500' },
              { status: 'vacant', label: 'Vacants', color: 'bg-gray-400' },
              { status: 'maintenance', label: 'Maintenance', color: 'bg-orange-500' },
              { status: 'missing', label: 'Manquants', color: 'bg-red-500' },
            ] as const
          ).map(({ status, color }) => {
            const count = stats?.byStatus[status] ?? 0
            const pct = stats?.total ? ((count / stats.total) * 100).toFixed(0) : '0'
            return (
              <div key={status} className="rounded-lg border border-border p-4">
                <StatusBadge status={status} />
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-sm text-muted-foreground">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* By city */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Par ville</h3>
        {stats?.byCity && Object.keys(stats.byCity).length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Ville</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Actifs</th>
                  <th className="px-4 py-2 text-right font-medium">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(stats.byCity)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([city, data]) => (
                    <tr key={city}>
                      <td className="px-4 py-2 font-medium">{city}</td>
                      <td className="px-4 py-2 text-right">{data.total}</td>
                      <td className="px-4 py-2 text-right">{data.active}</td>
                      <td className="px-4 py-2 text-right">
                        {data.total > 0 ? ((data.active / data.total) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Aucune donnée</p>
        )}
      </div>

      {/* Unchecked panels */}
      {(stats?.unchecked?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-orange-600">
            Panneaux non vérifiés depuis 30+ jours ({stats!.unchecked.length})
          </h3>
          <div className="mt-4 divide-y divide-border">
            {stats!.unchecked.slice(0, 20).map((panel) => (
              <div key={panel.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{panel.reference}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {panel.city || '—'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {panel.last_checked_at
                    ? `Dernier check: ${new Date(panel.last_checked_at).toLocaleDateString('fr-FR')}`
                    : 'Jamais vérifié'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign stats */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Campagnes</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{campaignStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{campaignStats?.active ?? 0}</p>
            <p className="text-xs text-muted-foreground">Actives</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{campaignStats?.completed ?? 0}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-500">{campaignStats?.draft ?? 0}</p>
            <p className="text-xs text-muted-foreground">Brouillons</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof PanelTop
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`h-5 w-5 ${color ?? 'text-muted-foreground'}`} />
      </div>
      <p className={`mt-2 text-3xl font-bold ${color ?? ''}`}>{value}</p>
    </div>
  )
}
