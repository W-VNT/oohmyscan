import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvoices, usePaginatedInvoices } from '@/hooks/admin/useInvoices'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Plus, Search, Loader2, Filter, ArrowUpDown, AlertTriangle, Clock, Download, Archive, X, Building2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { INVOICE_STATUSES, INVOICE_STATUS_CONFIG, INVOICE_TYPE_LABELS, type InvoiceStatus, type InvoiceType } from '@/lib/constants'
import { useListPageHotkeys } from '@/hooks/usePageHotkeys'
import { useClients } from '@/hooks/admin/useClients'

type SortOption = 'newest' | 'oldest' | 'due_date' | 'amount_desc' | 'amount_asc' | 'number'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'due_date', label: 'Échéance' },
  { value: 'amount_desc', label: 'Montant décroissant' },
  { value: 'amount_asc', label: 'Montant croissant' },
  { value: 'number', label: 'Numéro' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function getDueIndicator(inv: { status: string; due_at: string }): { text: string; className: string } | null {
  if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') return null
  const now = new Date()
  const due = new Date(inv.due_at)
  const msDay = 86400000
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / msDay)

  if (daysLeft < 0) return { text: `${Math.abs(daysLeft)}j de retard`, className: 'text-red-500' }
  if (daysLeft === 0) return { text: "Échéance aujourd'hui", className: 'text-orange-500' }
  if (daysLeft <= 7) return { text: `J-${daysLeft}`, className: 'text-orange-500' }
  return null
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const { data: invoices } = useInvoices() // for status counts
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [archiveMode, setArchiveMode] = useState<'active' | 'archived' | 'all'>('active')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { data: clientsList } = useClients()
  const { data: paginatedData, isLoading, isError, error, refetch } = usePaginatedInvoices(
    page,
    debouncedSearch,
    statusFilter,
    sort,
    archiveMode,
    clientFilter,
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useListPageHotkeys('/admin/invoices/new')

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const inv of invoices ?? []) {
      counts[inv.status] = (counts[inv.status] || 0) + 1
    }
    return counts
  }, [invoices])

  const filtered = paginatedData?.invoices ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [debouncedSearch, statusFilter, sort, archiveMode, clientFilter])

  const hasActiveFilters =
    !!debouncedSearch.trim() ||
    statusFilter !== 'all' ||
    clientFilter !== 'all' ||
    archiveMode !== 'active'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setClientFilter('all')
    setArchiveMode('active')
  }

  const filteredTotal = useMemo(() => {
    return filtered.reduce((sum, inv) => sum + inv.total_ttc, 0)
  }, [filtered])

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Numéro', 'Type', 'Client', 'Date', 'Échéance', 'Statut', 'Total HT', 'Total TTC']
    const rows = filtered.map((inv) => [
      inv.invoice_number,
      INVOICE_TYPE_LABELS[(inv.invoice_type as InvoiceType) ?? 'standard'] ?? 'Facture',
      inv.clients?.company_name ?? '',
      new Date(inv.issued_at).toLocaleDateString('fr-FR'),
      new Date(inv.due_at).toLocaleDateString('fr-FR'),
      INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.label ?? inv.status,
      inv.total_ht?.toFixed(2) ?? '0.00',
      inv.total_ttc?.toFixed(2) ?? '0.00',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} title="Impossible de charger les factures" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-base font-semibold sm:text-xl">Factures</h1>
          <span className="text-sm text-muted-foreground">
            <span className="sm:hidden">· </span>
            {filtered.length}{hasActiveFilters ? ` / ${invoices?.length ?? 0}` : ''}
            <span className="hidden sm:inline"> facture{(invoices?.length ?? 0) !== 1 ? 's' : ''}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/invoices/new')}>
            <Plus className="mr-1.5 size-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Filters — mobile compact (Search + Status + Plus). Desktop : tout visible. */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par numéro ou client..."
            className="h-10 pl-9 text-sm sm:h-9 sm:min-w-[240px]"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              <option value="all">Tous statuts ({invoices?.length ?? 0})</option>
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INVOICE_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <div className="relative hidden sm:flex">
            <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
            >
              <option value="all">Tous clients</option>
              {clientsList?.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div className="relative hidden sm:flex">
            <Archive className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={archiveMode}
              onChange={(e) => setArchiveMode(e.target.value as 'active' | 'archived' | 'all')}
              className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
            >
              <option value="active">Actifs</option>
              <option value="archived">Archivés</option>
              <option value="all">Tous</option>
            </select>
          </div>
          <div className="relative hidden sm:flex">
            <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="relative inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 text-sm hover:bg-muted sm:hidden"
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal className="size-4" />
            {((clientFilter !== 'all' ? 1 : 0) + (archiveMode !== 'active' ? 1 : 0)) > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {(clientFilter !== 'all' ? 1 : 0) + (archiveMode !== 'active' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {mobileFiltersOpen && (
          <div className="grid grid-cols-1 gap-2 sm:hidden">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
              >
                <option value="all">Tous clients</option>
                {clientsList?.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Archive className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={archiveMode}
                  onChange={(e) => setArchiveMode(e.target.value as 'active' | 'archived' | 'all')}
                  className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
                >
                  <option value="active">Actifs</option>
                  <option value="archived">Archivés</option>
                  <option value="all">Tous</option>
                </select>
              </div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <X className="size-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Mobile : cards stack */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <Card className="py-0">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {hasActiveFilters ? 'Aucune facture trouvée pour ces critères.' : 'Aucune facture pour le moment.'}
            </CardContent>
          </Card>
        ) : (
          filtered.map((inv) => {
            const dueIndicator = getDueIndicator(inv)
            const statusCfg = INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]
            return (
              <button
                key={inv.id}
                onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="truncate font-medium">{inv.invoice_number}</span>
                    {inv.invoice_type && inv.invoice_type !== 'standard' && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {INVOICE_TYPE_LABELS[inv.invoice_type as InvoiceType]}
                        {inv.invoice_type === 'acompte' && inv.deposit_percentage ? ` ${inv.deposit_percentage}%` : ''}
                      </span>
                    )}
                  </div>
                  <Badge variant={statusCfg?.variant ?? 'secondary'} className={`shrink-0 ${statusCfg?.className ?? ''}`}>
                    {statusCfg?.label ?? inv.status}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{inv.clients?.company_name ?? '—'}</p>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    {new Date(inv.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {dueIndicator && (
                      <span className={`ml-2 inline-flex items-center gap-0.5 font-medium ${dueIndicator.className}`}>
                        {dueIndicator.text.includes('retard') ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
                        {dueIndicator.text}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">{formatCurrency(inv.total_ttc)}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Desktop : table */}
      <Card className="hidden py-0 sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Date</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Échéance</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 size-8" />
                      {hasActiveFilters ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => {
                    const dueIndicator = getDueIndicator(inv)
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-medium">
                          {inv.invoice_number}
                          {inv.invoice_type && inv.invoice_type !== 'standard' && (
                            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                              {INVOICE_TYPE_LABELS[inv.invoice_type as InvoiceType]}
                              {inv.invoice_type === 'acompte' && inv.deposit_percentage ? ` ${inv.deposit_percentage}%` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.clients?.company_name ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {new Date(inv.issued_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">
                              {new Date(inv.due_at).toLocaleDateString('fr-FR')}
                            </span>
                            {dueIndicator && (
                              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${dueIndicator.className}`}>
                                {dueIndicator.text.includes('retard') ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
                                {dueIndicator.text}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.variant ?? 'secondary'} className={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.className}>
                            {INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.label ?? inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(inv.total_ttc)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {total} facture{total !== 1 ? 's' : ''} · Total page : <span className="font-medium tabular-nums text-foreground">{formatCurrency(filteredTotal)}</span>
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span>Page {page + 1} / {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
