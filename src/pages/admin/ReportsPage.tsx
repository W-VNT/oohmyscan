import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { generateFEC, downloadFEC } from '@/lib/fec-export'
import { useClients } from '@/hooks/admin/useClients'
import { useUsers, useOperatorStats } from '@/hooks/admin/useUsers'
import { useAllCampaignReports, useDeleteCampaignReport } from '@/hooks/admin/useCampaignReport'
import { CAMPAIGN_STATUS_CONFIG, type CampaignStatus } from '@/lib/constants'
import { toast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveAs } from 'file-saver'
import { cn } from '@/lib/utils'
import {
  Download,
  Loader2,
  PanelTop,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ExternalLink,
  FileText,
  Calendar,
  Trash2,
} from 'lucide-react'

const TABS = [
  { key: 'financier', label: 'Financier' },
  { key: 'panneaux', label: 'Panneaux' },
  { key: 'equipe', label: 'Équipe' },
  { key: 'rapports', label: 'Rapports campagnes' },
] as const
type TabKey = (typeof TABS)[number]['key']

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatMonth(key: string) {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function getQuarterStart(date: Date): string {
  const q = Math.floor(date.getMonth() / 3)
  return `${date.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { data: panels, isLoading: panelsLoading } = usePanels()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const { data: clients } = useClients()
  const { data: settings } = useCompanySettings()
  const { data: allUsers } = useUsers()
  const { data: operatorStats } = useOperatorStats()

  const [activeTab, setActiveTab] = useState<TabKey>('financier')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const nowRef = useRef(new Date())
  const now = nowRef.current
  const todayStr = now.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`)
  const [endDate, setEndDate] = useState(todayStr)
  const [fecYear, setFecYear] = useState(String(now.getFullYear()))

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
    const unchecked = panels.filter((p) => !p.last_checked_at || new Date(p.last_checked_at) < thirtyDaysAgo)
    const byCity: Record<string, { total: number; active: number }> = {}
    panels.forEach((p) => { const city = p.city || 'Non renseigné'; if (!byCity[city]) byCity[city] = { total: 0, active: 0 }; byCity[city].total++; if (p.status === 'active') byCity[city].active++ })
    const byType: Record<string, number> = {}
    panels.forEach((p) => { const t = p.type || 'Non renseigné'; byType[t] = (byType[t] || 0) + 1 })
    return { total, byStatus, occupationRate, unchecked, byCity, byType }
  }, [panels])

  const campaignStats = useMemo(() => {
    if (!campaigns) return null
    return { total: campaigns.length, active: campaigns.filter((c) => c.status === 'active').length, completed: campaigns.filter((c) => c.status === 'completed').length, draft: campaigns.filter((c) => c.status === 'draft').length }
  }, [campaigns])

  const financialStats = useMemo(() => {
    if (!invoices) return null
    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59')
    const periodInvoices = invoices.filter((i) => { const d = new Date(i.issued_at); return d >= start && d <= end })
    const paidInPeriod = periodInvoices.filter((i) => i.status === 'paid')
    const totalPaid = paidInPeriod.reduce((s, i) => s + i.total_ttc, 0)
    const totalPending = periodInvoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total_ttc, 0)
    const byMonth: Record<string, number> = {}
    paidInPeriod.forEach((inv) => { const d = new Date(inv.paid_at ?? inv.issued_at); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; byMonth[key] = (byMonth[key] ?? 0) + inv.total_ttc })
    const byClient: Record<string, { id: string; name: string; total: number; count: number }> = {}
    paidInPeriod.forEach((inv) => { const client = clients?.find((c) => c.id === inv.client_id); const name = client?.company_name ?? inv.clients?.company_name ?? 'Inconnu'; if (!byClient[inv.client_id]) byClient[inv.client_id] = { id: inv.client_id, name, total: 0, count: 0 }; byClient[inv.client_id].total += inv.total_ttc; byClient[inv.client_id].count++ })
    return { totalPaid, totalPending, byMonth, byClient, paidCount: paidInPeriod.length, periodCount: periodInvoices.length }
  }, [invoices, clients, startDate, endDate])

  // Comptage FEC : factures émises dans l'année fiscale (toutes statuts sauf brouillon)
  const fecCount = useMemo(() => {
    if (!invoices) return 0
    const yearStart = new Date(`${fecYear}-01-01`)
    const yearEnd = new Date(`${fecYear}-12-31T23:59:59`)
    return invoices.filter((i) => {
      if (i.status === 'draft') return false
      const d = new Date(i.issued_at)
      return d >= yearStart && d <= yearEnd
    }).length
  }, [invoices, fecYear])

  function formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // Exports
  function exportPanelsCSV() {
    if (!panels) return
    const headers = ['reference', 'name', 'status', 'city', 'format', 'type', 'lat', 'lng', 'installed_at', 'last_checked_at']
    const rows = panels.map((p) => headers.map((h) => { const val = p[h as keyof typeof p]; return val != null ? String(val) : '' }))
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `panneaux-${todayStr}.csv`)
  }

  function exportFinancialCSV() {
    if (!invoices) return
    const start = new Date(startDate); const end = new Date(endDate + 'T23:59:59')
    const periodInvoices = invoices.filter((i) => { const d = new Date(i.issued_at); return d >= start && d <= end })
    const headers = ['invoice_number', 'client', 'status', 'issued_at', 'due_at', 'total_ht', 'total_tva', 'total_ttc']
    const rows = periodInvoices.map((inv) => [inv.invoice_number, inv.clients?.company_name ?? '', inv.status, inv.issued_at, inv.due_at, String(inv.total_ht), String(inv.total_tva), String(inv.total_ttc)])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `factures-${startDate}-${endDate}.csv`)
  }

  function exportClientsCSV() {
    if (!clients) return
    const headers = ['company_name', 'contact_name', 'contact_email', 'contact_phone', 'address', 'postal_code', 'city', 'siret', 'tva_number', 'is_active']
    const rows = clients.map((c) => headers.map((h) => { const val = c[h as keyof typeof c]; return val != null ? String(val) : '' }))
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `clients-${todayStr}.csv`)
  }

  function handleExportFEC() {
    if (!invoices || !settings) return
    const fecInvoices = invoices.map((inv) => ({
      invoice_number: inv.invoice_number, issued_at: inv.issued_at, paid_at: inv.paid_at, status: inv.status,
      total_ht: inv.total_ht, total_tva: inv.total_ttc - inv.total_ht, total_ttc: inv.total_ttc,
      client_name: inv.clients?.company_name ?? 'Inconnu',
      invoice_type: (inv as Record<string, unknown>).invoice_type as string ?? 'standard',
    }))
    const content = generateFEC(fecInvoices, [], `${fecYear}-01-01`, `${fecYear}-12-31`)
    downloadFEC(content, settings.siret?.replace(/\s/g, '').slice(0, 9) ?? '000000000', fecYear)
  }

  if (panelsLoading || campaignsLoading || invoicesLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-3 sm:justify-between">
        <h1 className="hidden text-xl font-semibold sm:block">Rapports</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Menu unique : CSV + FEC */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowExportMenu((v) => !v)}>
              <Download className="mr-1.5 size-3.5" /> Exporter
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-[80vw] max-w-sm rounded-md border border-border bg-popover py-1 shadow-lg sm:w-72">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CSV</p>
                  <button
                    onClick={() => { exportPanelsCSV(); setShowExportMenu(false) }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted"
                  >
                    <PanelTop className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Panneaux</p>
                      <p className="text-[11px] text-muted-foreground">
                        {panels?.length ?? 0} panneau{(panels?.length ?? 0) !== 1 ? 'x' : ''} · Tout
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => { exportFinancialCSV(); setShowExportMenu(false) }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted"
                  >
                    <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Factures</p>
                      <p className="text-[11px] text-muted-foreground">
                        {financialStats?.periodCount ?? 0} facture{(financialStats?.periodCount ?? 0) !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Du {formatShortDate(startDate)} au {formatShortDate(endDate)}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => { exportClientsCSV(); setShowExportMenu(false) }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted"
                  >
                    <UserCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Clients</p>
                      <p className="text-[11px] text-muted-foreground">
                        {clients?.length ?? 0} client{(clients?.length ?? 0) !== 1 ? 's' : ''} · Tout
                      </p>
                    </div>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comptabilité</p>
                  <div className="px-3 py-2">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">FEC fiscal</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fecCount} écriture{fecCount !== 1 ? 's' : ''} pour {fecYear}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={2020}
                        max={2030}
                        value={fecYear}
                        onChange={(e) => setFecYear(e.target.value)}
                        className="h-8 flex-1 text-sm"
                        aria-label="Année fiscale"
                      />
                      <button
                        onClick={() => { handleExportFEC(); setShowExportMenu(false) }}
                        disabled={fecCount === 0}
                        className="h-8 shrink-0 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
                      >
                        Exporter FEC
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Fichier des Écritures Comptables — norme française
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — scroll horizontal mobile */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TAB: Financier === */}
      {activeTab === 'financier' && (
        <>
          {/* Period filter */}
          <Card>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Début</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 w-full text-sm sm:h-9 sm:w-40" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Fin</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 w-full text-sm sm:h-9 sm:w-40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {[
                    { label: 'Ce mois', fn: () => { setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(todayStr) } },
                    { label: 'Ce trimestre', fn: () => { setStartDate(getQuarterStart(now)); setEndDate(todayStr) } },
                    { label: 'Cette année', fn: () => { setStartDate(`${now.getFullYear()}-01-01`); setEndDate(todayStr) } },
                    { label: 'Tout', fn: () => { setStartDate('2020-01-01'); setEndDate(todayStr) } },
                  ].map((p) => (
                    <Button key={p.label} variant="outline" size="sm" onClick={p.fn}>{p.label}</Button>
                  ))}
                </div>
              </div>
              {/* Période active visible */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                Du <span className="font-medium text-foreground">{new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {' '}au{' '}
                <span className="font-medium text-foreground">{new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {' '}·{' '}
                <span>{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000)} jours</span>
              </p>
            </CardContent>
          </Card>

          {/* KPIs : slider horizontal sur mobile, grille sur desktop */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0">
            <Card className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <p className="text-xs text-muted-foreground">CA encaissé</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-green-600">{formatCurrency(financialStats?.totalPaid ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{financialStats?.paidCount ?? 0} factures</p>
              </CardContent>
            </Card>
            <Card className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-orange-500">{formatCurrency(financialStats?.totalPending ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total période</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency((financialStats?.totalPaid ?? 0) + (financialStats?.totalPending ?? 0))}</p>
              </CardContent>
            </Card>
          </div>

          {/* CA by month */}
          {financialStats?.byMonth && Object.keys(financialStats.byMonth).length > 0 && (
            <Card>
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold">CA par mois</h3>
                <div className="space-y-2">
                  {Object.entries(financialStats.byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => {
                    const maxAmount = Math.max(...Object.values(financialStats.byMonth))
                    const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="w-20 truncate text-xs capitalize text-muted-foreground sm:w-32 sm:text-sm">{formatMonth(month)}</span>
                        <div className="flex-1">
                          <div className="h-6 overflow-hidden rounded bg-muted">
                            <div className="flex h-full items-center rounded bg-green-500/20 px-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                              <span className="text-xs font-medium tabular-nums">{formatCurrency(amount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CA by client */}
          {financialStats?.byClient && Object.keys(financialStats.byClient).length > 0 && (
            <Card>
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold">CA par client</h3>
                <div className="-mx-2 overflow-x-auto px-2">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <th className="px-2 pb-2 font-medium">Client</th>
                        <th className="px-2 pb-2 text-right font-medium">Factures</th>
                        <th className="px-2 pb-2 text-right font-medium">CA TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {Object.entries(financialStats.byClient).sort(([, a], [, b]) => b.total - a.total).map(([clientId, row]) => (
                        <tr
                          key={clientId}
                          onClick={() => navigate(`/admin/clients/${clientId}`)}
                          className="cursor-pointer transition-colors hover:bg-muted/50"
                        >
                          <td className="px-2 py-2 font-medium">{row.name}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.count}</td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* === TAB: Panneaux === */}
      {activeTab === 'panneaux' && (
        <>
          {/* KPIs : slider mobile, grille desktop */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4">
            <Card className="min-w-[70%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Total panneaux</p>
                  <PanelTop className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{panelStats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="min-w-[70%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Taux d'occupation</p>
                  <TrendingUp className="size-4 text-green-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-green-600">{panelStats?.occupationRate ?? 0}%</p>
              </CardContent>
            </Card>
            <Card className="min-w-[70%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Campagnes actives</p>
                  <Megaphone className="size-4 text-blue-600" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">{campaignStats?.active ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="min-w-[70%] shrink-0 snap-center sm:min-w-0 sm:shrink">
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Non vérifiés (30j)</p>
                  <AlertTriangle className={`size-4 ${(panelStats?.unchecked?.length ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                </div>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${(panelStats?.unchecked?.length ?? 0) > 0 ? 'text-orange-600' : ''}`}>{panelStats?.unchecked?.length ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status distribution */}
          <Card>
            <CardContent>
              <h3 className="mb-4 text-sm font-semibold">Répartition par statut</h3>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {([
                  { status: 'active' as const, color: 'bg-green-500' },
                  { status: 'vacant' as const, color: 'bg-gray-400' },
                  { status: 'maintenance' as const, color: 'bg-orange-500' },
                  { status: 'missing' as const, color: 'bg-red-500' },
                ]).map(({ status, color }) => {
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
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold">Par type</h3>
                <div className="space-y-2">
                  {(() => {
                    const entries = Object.entries(panelStats.byType).sort(([, a], [, b]) => b - a)
                    const maxVal = Math.max(...entries.map(([, v]) => v))
                    return entries.map(([format, count]) => (
                      <div key={format} className="flex items-center gap-3">
                        <span className="w-20 truncate text-xs text-muted-foreground sm:w-28 sm:text-sm">{format}</span>
                        <div className="flex-1">
                          <div className="h-6 overflow-hidden rounded bg-muted">
                            <div className="flex h-full items-center rounded bg-blue-500/20 px-2" style={{ width: `${Math.max((count / maxVal) * 100, 8)}%` }}>
                              <span className="text-xs font-medium tabular-nums">{count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By city */}
          {panelStats?.byCity && Object.keys(panelStats.byCity).length > 0 && (
            <Card>
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold">Par ville</h3>
                <div className="-mx-2 overflow-x-auto px-2">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <th className="px-2 pb-2 font-medium">Ville</th>
                        <th className="px-2 pb-2 text-right font-medium">Total</th>
                        <th className="px-2 pb-2 text-right font-medium">Actifs</th>
                        <th className="px-2 pb-2 text-right font-medium">Occupation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {Object.entries(panelStats.byCity).sort(([, a], [, b]) => b.total - a.total).map(([city, data]) => (
                        <tr
                          key={city}
                          onClick={() => navigate(`/admin/panels?city=${encodeURIComponent(city)}`)}
                          className="cursor-pointer transition-colors hover:bg-muted/50"
                        >
                          <td className="px-2 py-2 font-medium">{city}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{data.total}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{data.active}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{data.total > 0 ? ((data.active / data.total) * 100).toFixed(0) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unchecked */}
          {(panelStats?.unchecked?.length ?? 0) > 0 && (
            <Card>
              <CardContent>
                <h3 className="mb-4 text-sm font-semibold text-orange-600">Non vérifiés depuis 30+ jours ({panelStats!.unchecked.length})</h3>
                <div className="divide-y divide-border/50">
                  {panelStats!.unchecked.slice(0, 20).map((panel) => (
                    <div key={panel.id} onClick={() => navigate(`/admin/panels/${panel.id}`)} className="flex cursor-pointer items-center justify-between py-2 transition-colors hover:bg-muted/50">
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="size-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{panel.name || panel.reference}</span>
                        <span className="text-xs text-muted-foreground">{panel.city || '—'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {panel.last_checked_at ? `${new Date(panel.last_checked_at).toLocaleDateString('fr-FR')}` : 'Jamais vérifié'}
                      </span>
                    </div>
                  ))}
                  {panelStats!.unchecked.length > 20 && <p className="py-2 text-xs text-muted-foreground">+{panelStats!.unchecked.length - 20} autres...</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* === TAB: Équipe === */}
      {activeTab === 'equipe' && (
        <>
          {/* Campaign stats — 2 cols mobile, 4 cols desktop */}
          <Card>
            <CardContent>
              <h3 className="mb-4 text-sm font-semibold">Campagnes</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <>
              {/* Stats globales équipe — 3 cols toujours (compact) */}
              <Card>
                <CardContent>
                  <h3 className="mb-4 text-sm font-semibold">Total équipe</h3>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {(() => {
                      const totalInstall = operatorStats.reduce((s, o) => s + o.panel_count, 0)
                      const totalPhotos = operatorStats.reduce((s, o) => s + o.photo_count, 0)
                      const activeOps = operatorStats.filter((o) => o.last_activity).length
                      return (
                        <>
                          <div className="text-center">
                            <p className="text-xl font-bold tabular-nums sm:text-2xl">{totalInstall}</p>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">Installations</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold tabular-nums sm:text-2xl">{totalPhotos}</p>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">Photos</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold tabular-nums sm:text-2xl">{activeOps}</p>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">Opérateurs actifs</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <UserCheck className="size-4" />
                    Stats par opérateur
                  </div>
                  <div className="-mx-2 overflow-x-auto px-2">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left">
                          <th className="px-2 pb-2 font-medium">Opérateur</th>
                          <th className="px-2 pb-2 text-right font-medium">Installations</th>
                          <th className="px-2 pb-2 text-right font-medium">Photos</th>
                          <th className="px-2 pb-2 text-right font-medium">Dernière activité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {operatorStats.sort((a, b) => b.panel_count - a.panel_count).map((stat) => {
                          const user = allUsers?.find((u) => u.id === stat.user_id)
                          return (
                            <tr
                              key={stat.user_id}
                              onClick={() => navigate('/admin/users')}
                              className="cursor-pointer transition-colors hover:bg-muted/50"
                            >
                              <td className="px-2 py-2 font-medium">{user?.full_name ?? 'Inconnu'}</td>
                              <td className="px-2 py-2 text-right tabular-nums">{stat.panel_count}</td>
                              <td className="px-2 py-2 text-right tabular-nums">{stat.photo_count}</td>
                              <td className="px-2 py-2 text-right text-xs text-muted-foreground">{stat.last_activity ? new Date(stat.last_activity).toLocaleDateString('fr-FR') : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* === TAB: Rapports campagnes === */}
      {activeTab === 'rapports' && <CampaignReportsList />}
    </div>
  )
}

function CampaignReportsList() {
  const navigate = useNavigate()
  const { data: reports, isLoading } = useAllCampaignReports()
  const deleteReport = useDeleteCampaignReport()
  const confirm = useConfirm()

  async function handleDelete(id: string, campaignId: string, campaignName: string) {
    const ok = await confirm({
      title: `Supprimer le rapport de "${campaignName}" ?`,
      description: 'Les slides seront perdus. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteReport.mutateAsync({ id, campaign_id: campaignId })
      toast('Rapport supprimé')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!reports?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Aucun rapport pour le moment</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Génère un rapport depuis la fiche d'une campagne active ou terminée.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/campaigns')}>
            <Megaphone className="mr-1.5 size-4" />
            Voir les campagnes
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Mobile : cards */}
      <div className="space-y-2 sm:hidden">
        {reports.map((r) => {
          const statusCfg = r.campaign ? CAMPAIGN_STATUS_CONFIG[r.campaign.status as CampaignStatus] : null
          return (
            <button
              key={r.id}
              onClick={() => navigate(`/admin/campaigns/${r.campaign_id}/report`)}
              className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate font-medium">{r.campaign?.name ?? '—'}</span>
                {statusCfg && (
                  <span className={cn('inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', statusCfg.className)}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
              {r.campaign?.client && (
                <p className="truncate text-xs text-muted-foreground">{r.campaign.client.company_name}</p>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{r.slides_count} slide{r.slides_count !== 1 ? 's' : ''}</span>
                <span className="tabular-nums">MAJ {new Date(r.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Desktop : table */}
      <Card className="hidden py-0 sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Campagne</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Client</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-center font-medium">Slides</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Période</th>
                  <th className="px-4 py-3 font-medium">Mis à jour</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => {
                  const statusCfg = r.campaign ? CAMPAIGN_STATUS_CONFIG[r.campaign.status as CampaignStatus] : null
                  return (
                    <tr key={r.id} onClick={() => navigate(`/admin/campaigns/${r.campaign_id}/report`)} className="cursor-pointer transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{r.campaign?.name ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{r.campaign?.client?.company_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {statusCfg && (
                          <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
                            {statusCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{r.slides_count}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {r.campaign && (
                          <>
                            {new Date(r.campaign.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            {' → '}
                            {r.campaign.end_date ? new Date(r.campaign.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'en cours'}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {new Date(r.updated_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(r.id, r.campaign_id, r.campaign?.name ?? 'ce rapport')}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer le rapport"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
