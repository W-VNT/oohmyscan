import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useInvoices, type InvoiceWithClient } from '@/hooks/admin/useInvoices'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { generateFEC, downloadFEC } from '@/lib/fec-export'
import { useClients } from '@/hooks/admin/useClients'
import { useUsers, useOperatorStats } from '@/hooks/admin/useUsers'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { saveAs } from 'file-saver'
import {
  Download,
  Loader2,
  PanelTop,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  Receipt,
  UserCheck,
  ExternalLink,
} from 'lucide-react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatMonth(key: string) {
  const [y, m] = key.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function getQuarterStart(date: Date): string {
  const q = Math.floor(date.getMonth() / 3)
  const month = String(q * 3 + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-01`
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { data: panels, isLoading: panelsLoading } = usePanels()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const { data: clients } = useClients()
  const { data: allUsers } = useUsers()
  const { data: operatorStats } = useOperatorStats()

  const nowRef = useRef(new Date())
  const now = nowRef.current
  const todayStr = now.toISOString().split('T')[0]

  // Period filter — defaults to current year
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`)
  const [endDate, setEndDate] = useState(todayStr)

  // Panel stats
  const panelStats = useMemo(() => {
    if (!panels) return null
    const total = panels.length
    const byStatus = {
      active: panels.filter((p) => p.status === 'active').length,
      vacant: panels.filter((p) => p.status === 'vacant').length,
      missing: panels.filter((p) => p.status === 'missing').length,
      maintenance: panels.filter((p) => p.status === 'maintenance').length,
    }
    const occupationRate = total > 0 ? ((byStatus.active / total) * 100).toFixed(1) : '0'

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const unchecked = panels.filter((p) => {
      if (!p.last_checked_at) return true
      return new Date(p.last_checked_at) < thirtyDaysAgo
    })

    const byCity: Record<string, { total: number; active: number }> = {}
    panels.forEach((p) => {
      const city = p.city || 'Non renseigné'
      if (!byCity[city]) byCity[city] = { total: 0, active: 0 }
      byCity[city].total++
      if (p.status === 'active') byCity[city].active++
    })

    const byType: Record<string, number> = {}
    panels.forEach((p) => {
      const t = p.type || 'Non renseigné'
      byType[t] = (byType[t] || 0) + 1
    })

    return { total, byStatus, occupationRate, unchecked, byCity, byType }
  }, [panels])

  // Campaign stats
  const campaignStats = useMemo(() => {
    if (!campaigns) return null
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
    }
  }, [campaigns])

  // Financial stats (filtered by period)
  const financialStats = useMemo(() => {
    if (!invoices) return null

    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59')

    const periodInvoices = invoices.filter((i) => {
      const d = new Date(i.issued_at)
      return d >= start && d <= end
    })

    const paidInPeriod = periodInvoices.filter((i) => i.status === 'paid')
    const totalPaid = paidInPeriod.reduce((s, i) => s + i.total_ttc, 0)
    const totalPending = periodInvoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((s, i) => s + i.total_ttc, 0)

    // CA by month
    const byMonth: Record<string, number> = {}
    paidInPeriod.forEach((inv) => {
      const d = new Date(inv.paid_at ?? inv.issued_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] ?? 0) + inv.total_ttc
    })

    // CA by client
    const byClient: Record<string, { id: string; name: string; total: number; count: number }> = {}
    paidInPeriod.forEach((inv) => {
      const client = clients?.find((c) => c.id === inv.client_id)
      const name = client?.company_name ?? inv.clients?.company_name ?? 'Inconnu'
      if (!byClient[inv.client_id]) byClient[inv.client_id] = { id: inv.client_id, name, total: 0, count: 0 }
      byClient[inv.client_id].total += inv.total_ttc
      byClient[inv.client_id].count++
    })

    return { totalPaid, totalPending, byMonth, byClient, paidCount: paidInPeriod.length }
  }, [invoices, clients, startDate, endDate])

  function exportPanelsCSV() {
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
    saveAs(blob, `oohmyscan-panneaux-${todayStr}.csv`)
  }

  function exportFinancialCSV() {
    if (!invoices) return
    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59')
    const periodInvoices = invoices.filter((i) => {
      const d = new Date(i.issued_at)
      return d >= start && d <= end
    })
    const headers = ['invoice_number', 'client', 'status', 'issued_at', 'due_at', 'total_ht', 'total_tva', 'total_ttc']
    const rows = periodInvoices.map((inv) => [
      inv.invoice_number,
      inv.clients?.company_name ?? '',
      inv.status,
      inv.issued_at,
      inv.due_at,
      String(inv.total_ht),
      String(inv.total_tva),
      String(inv.total_ttc),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `oohmyscan-factures-${startDate}-${endDate}.csv`)
  }

  function exportClientsCSV() {
    if (!clients) return
    const headers = ['company_name', 'contact_name', 'contact_email', 'contact_phone', 'address', 'postal_code', 'city', 'siret', 'tva_number', 'is_active']
    const rows = clients.map((c) =>
      headers.map((h) => {
        const val = c[h as keyof typeof c]
        return val != null ? String(val) : ''
      })
    )
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `oohmyscan-clients-${todayStr}.csv`)
  }

  if (panelsLoading || campaignsLoading || invoicesLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Rapports</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPanelsCSV}>
            <Download className="mr-1.5 size-3.5" />
            Export panneaux
          </Button>
          <Button variant="outline" size="sm" onClick={exportFinancialCSV}>
            <Download className="mr-1.5 size-3.5" />
            Export factures
          </Button>
          <Button variant="outline" size="sm" onClick={exportClientsCSV}>
            <Download className="mr-1.5 size-3.5" />
            Export clients
          </Button>
        </div>
      </div>

      {/* Period filter */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Début</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Ce mois', fn: () => { setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(todayStr) } },
              { label: 'Ce trimestre', fn: () => { setStartDate(getQuarterStart(now)); setEndDate(todayStr) } },
              { label: 'Cette année', fn: () => { setStartDate(`${now.getFullYear()}-01-01`); setEndDate(todayStr) } },
              { label: 'Tout', fn: () => { setStartDate('2020-01-01'); setEndDate(todayStr) } },
            ].map((preset) => (
              <Button key={preset.label} variant="outline" size="sm" onClick={preset.fn}>
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total panneaux</p>
              <PanelTop className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{panelStats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Taux d'occupation</p>
              <TrendingUp className="size-4 text-green-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-green-600">{panelStats?.occupationRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Campagnes actives</p>
              <Megaphone className="size-4 text-blue-600" />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{campaignStats?.active ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Non vérifiés (30j)</p>
              <AlertTriangle className={`size-4 ${(panelStats?.unchecked?.length ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
            </div>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${(panelStats?.unchecked?.length ?? 0) > 0 ? 'text-orange-600' : ''}`}>
              {panelStats?.unchecked?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial section */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="size-4" />
            Chiffre d'affaires (période sélectionnée)
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">CA encaissé</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-green-600">
                {formatCurrency(financialStats?.totalPaid ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">{financialStats?.paidCount ?? 0} factures</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-orange-500">
                {formatCurrency(financialStats?.totalPending ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Total période</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency((financialStats?.totalPaid ?? 0) + (financialStats?.totalPending ?? 0))}
              </p>
            </div>
          </div>

          {/* CA by month */}
          {financialStats?.byMonth && Object.keys(financialStats.byMonth).length > 0 && (() => {
            const entries = Object.entries(financialStats.byMonth).sort(([a], [b]) => a.localeCompare(b))
            const maxAmount = Math.max(...Object.values(financialStats.byMonth))
            return (
              <>
                <Separator />
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CA par mois</p>
                  <div className="space-y-2">
                    {entries.map(([month, amount]) => {
                      const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
                      return (
                        <div key={month} className="flex items-center gap-3">
                          <span className="w-32 text-sm capitalize text-muted-foreground">{formatMonth(month)}</span>
                          <div className="flex-1">
                            <div className="h-5 overflow-hidden rounded bg-muted">
                              <div
                                className="flex h-full items-center rounded bg-green-500/20 px-2"
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              >
                                <span className="text-xs font-medium tabular-nums">{formatCurrency(amount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          })()}

          {/* CA by client */}
          {financialStats?.byClient && Object.keys(financialStats.byClient).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CA par client</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Client</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Factures</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">CA TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {Object.entries(financialStats.byClient)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([clientId, row]) => (
                        <tr key={clientId}>
                          <td className="py-2 font-medium">{row.name}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{row.count}</td>
                          <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status distribution */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold">Répartition par statut <span className="font-normal text-muted-foreground">(toutes périodes)</span></h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { status: 'active', color: 'bg-green-500' },
                { status: 'vacant', color: 'bg-gray-400' },
                { status: 'maintenance', color: 'bg-orange-500' },
                { status: 'missing', color: 'bg-red-500' },
              ] as const
            ).map(({ status, color }) => {
              const count = panelStats?.byStatus[status] ?? 0
              const pct = panelStats?.total ? ((count / panelStats.total) * 100).toFixed(0) : '0'
              return (
                <div key={status} className="rounded-lg border border-border p-4">
                  <StatusBadge status={status} />
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-2xl font-bold tabular-nums">{count}</span>
                    <span className="text-sm text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* By type */}
      {panelStats?.byType && Object.keys(panelStats.byType).length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold">Panneaux par type <span className="font-normal text-muted-foreground">(toutes périodes)</span></h3>
            <div className="mt-4 space-y-2">
              {(() => {
                const entries = Object.entries(panelStats.byType).sort(([, a], [, b]) => b - a)
                const maxVal = Math.max(...entries.map(([, v]) => v))
                return entries.map(([format, count]) => {
                  const pct = maxVal > 0 ? (count / maxVal) * 100 : 0
                  return (
                    <div key={format} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-muted-foreground">{format}</span>
                      <div className="flex-1">
                        <div className="h-5 overflow-hidden rounded bg-muted">
                          <div
                            className="flex h-full items-center rounded bg-blue-500/20 px-2"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            <span className="text-xs font-medium tabular-nums">{count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By city */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold">Panneaux par ville <span className="font-normal text-muted-foreground">(toutes périodes)</span></h3>
          {panelStats?.byCity && Object.keys(panelStats.byCity).length > 0 ? (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Ville</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Total</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Actifs</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Object.entries(panelStats.byCity)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([city, data]) => (
                    <tr key={city}>
                      <td className="py-2 font-medium">{city}</td>
                      <td className="py-2 text-right tabular-nums">{data.total}</td>
                      <td className="py-2 text-right tabular-nums">{data.active}</td>
                      <td className="py-2 text-right tabular-nums">
                        {data.total > 0 ? ((data.active / data.total) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Aucune donnée</p>
          )}
        </CardContent>
      </Card>

      {/* Unchecked panels */}
      {(panelStats?.unchecked?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-orange-600">
              Panneaux non vérifiés depuis 30+ jours ({panelStats!.unchecked.length})
            </h3>
            <div className="mt-4 divide-y divide-border/50">
              {panelStats!.unchecked.slice(0, 20).map((panel) => (
                <div
                  key={panel.id}
                  onClick={() => navigate(`/admin/panels/${panel.id}`)}
                  className="flex cursor-pointer items-center justify-between py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="size-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{panel.name || panel.reference}</span>
                    <span className="text-xs text-muted-foreground">{panel.city || '—'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {panel.last_checked_at
                      ? `Dernier check: ${new Date(panel.last_checked_at).toLocaleDateString('fr-FR')}`
                      : 'Jamais vérifié'}
                  </span>
                </div>
              ))}
              {panelStats!.unchecked.length > 20 && (
                <p className="py-2 text-xs text-muted-foreground">
                  +{panelStats!.unchecked.length - 20} autres...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign stats */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold">Campagnes <span className="font-normal text-muted-foreground">(toutes périodes)</span></h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Total', value: campaignStats?.total ?? 0 },
              { label: 'Actives', value: campaignStats?.active ?? 0, color: 'text-green-600' },
              { label: 'Terminées', value: campaignStats?.completed ?? 0, color: 'text-blue-600' },
              { label: 'Brouillons', value: campaignStats?.draft ?? 0, color: 'text-muted-foreground' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-2xl font-bold tabular-nums ${item.color ?? ''}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operator stats */}
      {operatorStats && operatorStats.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserCheck className="size-4" />
              Stats par opérateur <span className="font-normal text-muted-foreground">(toutes périodes)</span>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Opérateur</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Installations</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Photos</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {operatorStats
                  .sort((a, b) => b.panel_count - a.panel_count)
                  .map((stat) => {
                    const user = allUsers?.find((u) => u.id === stat.user_id)
                    return (
                      <tr key={stat.user_id}>
                        <td className="py-2 font-medium">{user?.full_name ?? 'Inconnu'}</td>
                        <td className="py-2 text-right tabular-nums">{stat.panel_count}</td>
                        <td className="py-2 text-right tabular-nums">{stat.photo_count}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {stat.last_activity
                            ? new Date(stat.last_activity).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {/* FEC Export */}
      <FECExportSection invoices={invoices} />
    </div>
  )
}

function FECExportSection({ invoices }: { invoices: InvoiceWithClient[] | undefined }) {
  const { data: settings } = useCompanySettings()
  const [fecYear, setFecYear] = useState(String(new Date().getFullYear()))

  function handleExportFEC() {
    if (!invoices || !settings) return

    const startDate = `${fecYear}-01-01`
    const endDate = `${fecYear}-12-31`

    const fecInvoices = invoices.map((inv) => ({
      invoice_number: inv.invoice_number,
      issued_at: inv.issued_at,
      paid_at: inv.paid_at,
      status: inv.status,
      total_ht: inv.total_ht,
      total_tva: inv.total_ttc - inv.total_ht,
      total_ttc: inv.total_ttc,
      client_name: inv.clients?.company_name ?? 'Inconnu',
      invoice_type: (inv as Record<string, unknown>).invoice_type as string ?? 'standard',
    }))

    // We don't have payments loaded at the report level — pass empty for now
    const content = generateFEC(fecInvoices, [], startDate, endDate)
    const siren = settings.siret?.replace(/\s/g, '').slice(0, 9) ?? '000000000'
    downloadFEC(content, siren, fecYear)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold">Export comptable FEC</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Fichier des Écritures Comptables — obligatoire pour la comptabilité française (Art. L47 A-1 LPF).
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Input
            type="number"
            min={2020}
            max={2030}
            value={fecYear}
            onChange={(e) => setFecYear(e.target.value)}
            className="w-24 text-sm"
          />
          <Button size="sm" variant="outline" onClick={handleExportFEC} disabled={!invoices?.length}>
            <Download className="mr-1.5 size-3.5" />
            Exporter FEC {fecYear}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
