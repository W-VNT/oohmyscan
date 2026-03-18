import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { usePotentialRequests } from '@/hooks/admin/usePotentialRequests'
import {
  PanelTop,
  Megaphone,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Receipt,
  Clock,
  CalendarClock,
  Camera,
  ChevronRight,
  SearchCheck,
  Inbox,
  FileText,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/lib/constants'
import {
  usePanelStats,
  useCampaignStats,
  useInvoiceStats,
  useFinanceStats,
  useQuoteConversionRate,
  useRecentInvoices,
  useRecentActivity,
} from '@/hooks/admin/useDashboardStats'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: panelStats, isLoading: panelsLoading } = usePanelStats()
  const { data: campaignStats, isLoading: campaignsLoading } = useCampaignStats()
  const { data: invoiceStats, isLoading: invoicesLoading } = useInvoiceStats()
  const { data: activity, isLoading: activityLoading } = useRecentActivity()
  const { data: financeStats } = useFinanceStats()
  const { data: conversionRate } = useQuoteConversionRate()
  const { data: recentInvoices } = useRecentInvoices()
  const { data: potentialRequests } = usePotentialRequests()

  const [caMode, setCaMode] = useState<'month' | 'total'>('month')

  if (panelsLoading || campaignsLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const ps = panelStats!
  const cs = campaignStats!
  const inv = invoiceStats!

  const occupationRate = ps.total > 0 ? Math.round((ps.active / ps.total) * 100) : 0
  const occupationColor = occupationRate >= 60 ? 'text-green-600' : occupationRate >= 30 ? 'text-orange-500' : 'text-red-500'
  const OccupationIcon = occupationRate >= 60 ? TrendingUp : TrendingDown

  const pendingTotal = inv.totalSentTTC + inv.totalOverdueTTC
  const pendingCount = inv.totalSentCount + inv.totalOverdueCount

  const caAmount = caMode === 'month' ? inv.monthPaidTTC : inv.totalPaidTTC
  const caCount = caMode === 'month' ? inv.monthPaidCount : inv.totalPaidCount
  const caLabel = caMode === 'month' ? 'ce mois' : 'au total'

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const draftPotentials = potentialRequests?.filter((r) => r.status === 'draft').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header with greeting + quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {firstName ? `Bonjour, ${firstName}` : 'Tableau de bord'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/invoices/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted">
            <Plus className="size-3" /> Facture
          </Link>
          <Link to="/admin/quotes/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted">
            <Plus className="size-3" /> Devis
          </Link>
          <Link to="/admin/campaigns" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted">
            <Plus className="size-3" /> Campagne
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/panels" className="group rounded-xl transition-all hover:ring-2 hover:ring-primary/20">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Panneaux</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{ps.total}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <OccupationIcon className={`size-4 ${occupationColor}`} />
                    <span className={`font-semibold ${occupationColor}`}>{occupationRate}%</span>
                    <span className="text-muted-foreground">occupation</span>
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted/80">
                  <PanelTop className="size-5 text-foreground/60" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/campaigns" className="group rounded-xl transition-all hover:ring-2 hover:ring-blue-500/20">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Campagnes actives</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-blue-600">{cs.activeCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cs.total} au total
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Megaphone className="size-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/invoices" className="group rounded-xl transition-all hover:ring-2 hover:ring-green-500/20">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CA facturé</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-green-600">{formatCurrency(caAmount)}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {caCount} facture{caCount !== 1 ? 's' : ''} {caLabel}
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); setCaMode(caMode === 'month' ? 'total' : 'month') }}
                      className="font-medium text-primary hover:underline"
                    >
                      {caMode === 'month' ? 'Total' : 'Ce mois'}
                    </button>
                  </div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Receipt className="size-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/invoices" className="group rounded-xl transition-all hover:ring-2 hover:ring-orange-500/20">
          <Card className="h-full overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En attente</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-orange-500">{formatCurrency(pendingTotal)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingCount} facture{pendingCount !== 1 ? 's' : ''}
                    {inv.totalOverdueCount > 0 && (
                      <span className="font-medium text-red-500"> · {inv.totalOverdueCount} en retard</span>
                    )}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Clock className="size-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alerts */}
      {(ps.missing > 0 || inv.totalOverdueCount > 0 || cs.endingSoon.length > 0 || draftPotentials > 0) && (
        <div className="space-y-2">
          {ps.missing > 0 && (
            <Link
              to="/admin/panels"
              className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
            >
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
              <span className="text-red-800 dark:text-red-300">
                <strong>{ps.missing}</strong> panneau{ps.missing !== 1 ? 'x' : ''} manquant{ps.missing !== 1 ? 's' : ''}
              </span>
            </Link>
          )}
          {inv.totalOverdueCount > 0 && (
            <Link
              to="/admin/invoices"
              className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm transition-colors hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
            >
              <Receipt className="size-4 shrink-0 text-orange-600" />
              <span className="text-orange-800 dark:text-orange-300">
                <strong>{inv.totalOverdueCount}</strong> facture{inv.totalOverdueCount !== 1 ? 's' : ''} en retard —{' '}
                {formatCurrency(inv.totalOverdueTTC)}
              </span>
            </Link>
          )}
          {cs.endingSoon.length > 0 && (
            <Link
              to="/admin/campaigns"
              className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
            >
              <CalendarClock className="size-4 shrink-0 text-blue-600" />
              <div className="min-w-0 text-blue-800 dark:text-blue-300">
                <strong>{cs.endingSoon.length}</strong> campagne{cs.endingSoon.length !== 1 ? 's' : ''} se termine{cs.endingSoon.length !== 1 ? 'nt' : ''} dans moins de 7 jours
                <p className="mt-0.5 truncate text-[12px] text-blue-600/80 dark:text-blue-400/80">
                  {cs.endingSoon.map((c) => c.name).join(', ')}
                </p>
              </div>
            </Link>
          )}
          {draftPotentials > 0 && (
            <Link
              to="/admin/potential"
              className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm transition-colors hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/30 dark:hover:bg-purple-950/50"
            >
              <SearchCheck className="size-4 shrink-0 text-purple-600" />
              <span className="text-purple-800 dark:text-purple-300">
                <strong>{draftPotentials}</strong> demande{draftPotentials !== 1 ? 's' : ''} de potentiel en brouillon
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status breakdown */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Répartition par statut</h3>
              <Link to="/admin/panels" className="text-[11px] font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {([
                { status: 'active' as const, count: ps.active, color: 'bg-green-500' },
                { status: 'vacant' as const, count: ps.vacant, color: 'bg-gray-400' },
                { status: 'maintenance' as const, count: ps.maintenance, color: 'bg-orange-500' },
                { status: 'missing' as const, count: ps.missing, color: 'bg-red-500' },
              ] as const).map(({ status, count, color }) => {
                const pct = ps.total > 0 ? Math.round((count / ps.total) * 100) : 0
                return (
                  <Link key={status} to={`/admin/panels?status=${status}`} className="flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50">
                    <StatusBadge status={status} />
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm tabular-nums">
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground"> · {pct}%</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Activité récente</h3>
              <Link to="/admin/panels" className="text-[11px] font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            {activityLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : !activity?.length ? (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Inbox className="size-6" />
                <p className="mt-1 text-[12px]">Aucune activité récente</p>
              </div>
            ) : (
              <div className="mt-3 max-h-[200px] divide-y divide-border overflow-y-auto">
                {activity.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    to={`/admin/panels/${item.panelId}`}
                    className="flex items-center gap-2.5 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                      item.type === 'photo' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                    }`}>
                      {item.type === 'photo' ? <Camera className="size-3" /> : <Megaphone className="size-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{item.panelName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.detail}
                        {item.userName && ` · ${item.userName}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(item.date)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ending soon campaigns */}
        <Card>
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Campagnes à échéance</h3>
              <Link to="/admin/campaigns" className="text-[11px] font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            {cs.endingSoon.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <CalendarClock className="size-6" />
                <p className="mt-1 text-[12px]">Aucune campagne à échéance</p>
              </div>
            ) : (
              <div className="mt-3 max-h-[200px] divide-y divide-border overflow-y-auto">
                {cs.endingSoon.map((c) => (
                  <Link
                    key={c.id}
                    to={`/admin/campaigns/${c.id}`}
                    className="flex items-center justify-between py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.client}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.daysLeft <= 2
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-orange-500/10 text-orange-600'
                      }`}>
                        {c.daysLeft === 0 ? "Aujourd'hui" : `J-${c.daysLeft}`}
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finance section */}
      {financeStats && (
        <>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Finance</h2>
            </div>
            <Link to="/admin/invoices" className="text-[11px] font-medium text-primary hover:underline">
              Toutes les factures <ArrowRight className="inline size-3" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Pipeline + Conversion + Aging — single dense card */}
            <Card>
              <CardContent className="space-y-4 pt-5 pb-4">
                {/* Pipeline */}
                <Link to="/admin/quotes" className="flex items-center justify-between rounded-md px-1 py-1 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <FileText className="size-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline devis</p>
                      <p className="text-sm font-bold tabular-nums text-purple-600">{formatCurrency(financeStats.quotePipeline.totalTTC)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{financeStats.quotePipeline.count} en cours</span>
                </Link>

                {/* Conversion rate */}
                {conversionRate && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                        <TrendingUp className="size-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taux de conversion</p>
                        <p className="text-sm font-bold tabular-nums text-green-600">{conversionRate.rate}%</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{conversionRate.converted}/{conversionRate.total} devis</span>
                  </div>
                )}

                {/* Aging inline */}
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Impayés</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {financeStats.aging.map((bucket) => (
                      <div key={bucket.label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                        <div className={`mx-auto mb-1 size-1.5 rounded-full ${bucket.color}`} />
                        <p className="text-[10px] text-muted-foreground">{bucket.label.replace(' jours', 'j')}</p>
                        <p className="text-xs font-bold tabular-nums">{bucket.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly CA bar chart — improved */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <h3 className="text-sm font-semibold">CA encaissé</h3>
                <p className="text-[10px] text-muted-foreground">6 derniers mois</p>
                {financeStats.monthlyCA.every((m) => m.amount === 0) ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p className="text-xs">Aucun encaissement sur la période</p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-end gap-1.5" style={{ height: 120 }}>
                    {financeStats.monthlyCA.map((m) => {
                      const maxAmount = Math.max(...financeStats.monthlyCA.map((x) => x.amount), 1)
                      const heightPct = m.amount > 0 ? Math.max(8, (m.amount / maxAmount) * 100) : 4
                      return (
                        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                            {m.amount > 0 ? (m.amount >= 1000 ? `${Math.round(m.amount / 1000)}k` : formatCurrency(m.amount)) : ''}
                          </span>
                          <div
                            className={`w-full rounded-t transition-all ${m.amount > 0 ? 'bg-primary/80' : 'bg-muted/60'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[9px] text-muted-foreground">{m.month}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent invoices + Top clients */}
            <Card>
              <CardContent className="pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Dernières factures</h3>
                  <Link to="/admin/invoices" className="text-[11px] font-medium text-primary hover:underline">
                    Voir tout
                  </Link>
                </div>
                {!recentInvoices?.length ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Aucune facture</p>
                ) : (
                  <div className="mt-2 max-h-[160px] divide-y divide-border overflow-y-auto">
                    {recentInvoices.map((inv) => (
                      <Link
                        key={inv.id}
                        to={`/admin/invoices/${inv.id}`}
                        className="flex items-center justify-between py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium">{inv.invoice_number}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{inv.client_name}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-medium tabular-nums">{formatCurrency(inv.total_ttc)}</p>
                          <p className={`text-[10px] font-medium ${
                            inv.status === 'paid' ? 'text-green-600' :
                            inv.status === 'overdue' ? 'text-red-500' :
                            inv.status === 'sent' ? 'text-blue-600' :
                            'text-muted-foreground'
                          }`}>
                            {INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.label ?? inv.status}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Top clients mini */}
                {financeStats.topClients.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Top clients</p>
                      <Users className="size-3 text-muted-foreground" />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {financeStats.topClients.slice(0, 3).map((client, i) => (
                        <div key={client.name} className="flex items-center justify-between">
                          <p className="truncate text-[11px]"><span className="font-bold text-muted-foreground">{i + 1}.</span> {client.name}</p>
                          <p className="shrink-0 text-[11px] font-medium tabular-nums">{formatCurrency(client.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
