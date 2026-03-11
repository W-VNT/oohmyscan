import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import {
  PanelTop,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Receipt,
  Clock,
  CalendarClock,
} from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'

export function DashboardPage() {
  const { data: panels, isLoading: panelsLoading } = usePanels()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()

  if (panelsLoading || campaignsLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Panel stats
  const total = panels?.length ?? 0
  const active = panels?.filter((p) => p.status === 'active').length ?? 0
  const vacant = panels?.filter((p) => p.status === 'vacant').length ?? 0
  const missing = panels?.filter((p) => p.status === 'missing').length ?? 0
  const maintenance = panels?.filter((p) => p.status === 'maintenance').length ?? 0
  const occupationRate = total > 0 ? Math.round((active / total) * 100) : 0

  // Campaign stats
  const activeCampaigns = campaigns?.filter((c) => c.status === 'active') ?? []
  const endingSoon = activeCampaigns.filter((c) => {
    const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
    return daysLeft >= 0 && daysLeft <= 7
  })

  // Invoice stats
  const paidInvoices = invoices?.filter((i) => i.status === 'paid') ?? []
  const pendingInvoices = invoices?.filter((i) => i.status === 'sent' || i.status === 'overdue') ?? []
  const overdueInvoices = invoices?.filter((i) => i.status === 'overdue') ?? []
  const totalPaidTTC = paidInvoices.reduce((sum, i) => sum + i.total_ttc, 0)
  const totalPendingTTC = pendingInvoices.reduce((sum, i) => sum + i.total_ttc, 0)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  // Recent panels (last 10 updated)
  const recentPanels = [...(panels ?? [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Panneaux</p>
              <PanelTop className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{total}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <TrendingUp className="mr-1 inline size-3 text-green-600" />
              {occupationRate}% d'occupation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Campagnes actives</p>
              <Megaphone className="size-4 text-blue-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{activeCampaigns.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {campaigns?.length ?? 0} au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">CA facturé</p>
              <Receipt className="size-4 text-green-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-green-600">{formatCurrency(totalPaidTTC)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {paidInvoices.length} facture{paidInvoices.length !== 1 ? 's' : ''} payée{paidInvoices.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">En attente</p>
              <Clock className="size-4 text-orange-500" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-orange-500">{formatCurrency(totalPendingTTC)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pendingInvoices.length} facture{pendingInvoices.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(missing > 0 || overdueInvoices.length > 0 || endingSoon.length > 0) && (
        <div className="space-y-2">
          {missing > 0 && (
            <Link
              to="/admin/panels"
              className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
            >
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
              <span className="text-red-800 dark:text-red-300">
                <strong>{missing}</strong> panneau{missing !== 1 ? 'x' : ''} manquant{missing !== 1 ? 's' : ''}
              </span>
            </Link>
          )}
          {overdueInvoices.length > 0 && (
            <Link
              to="/admin/invoices"
              className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm transition-colors hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
            >
              <Receipt className="size-4 shrink-0 text-orange-600" />
              <span className="text-orange-800 dark:text-orange-300">
                <strong>{overdueInvoices.length}</strong> facture{overdueInvoices.length !== 1 ? 's' : ''} en retard —{' '}
                {formatCurrency(overdueInvoices.reduce((s, i) => s + i.total_ttc, 0))}
              </span>
            </Link>
          )}
          {endingSoon.length > 0 && (
            <Link
              to="/admin/campaigns"
              className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
            >
              <CalendarClock className="size-4 shrink-0 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-300">
                <strong>{endingSoon.length}</strong> campagne{endingSoon.length !== 1 ? 's' : ''} se termine{endingSoon.length !== 1 ? 'nt' : ''} dans moins de 7 jours
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold">Répartition par statut</h3>
            <div className="mt-4 space-y-3">
              {[
                { status: 'active' as const, count: active, label: 'Actifs', color: 'bg-green-500' },
                { status: 'vacant' as const, count: vacant, label: 'Vacants', color: 'bg-gray-400' },
                { status: 'maintenance' as const, count: maintenance, label: 'Maintenance', color: 'bg-orange-500' },
                { status: 'missing' as const, count: missing, label: 'Manquants', color: 'bg-red-500' },
              ].map(({ status, count, color }) => (
                <div key={status} className="flex items-center gap-3">
                  <StatusBadge status={status} />
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold">Activité récente</h3>
            {recentPanels.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune activité</p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {recentPanels.map((panel) => (
                  <Link
                    key={panel.id}
                    to={`/admin/panels/${panel.id}`}
                    className="flex items-center justify-between py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{panel.name || panel.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {panel.city || panel.address || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={panel.status as PanelStatus} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(panel.updated_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
