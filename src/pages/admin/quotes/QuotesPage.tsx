import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes, usePaginatedQuotes } from '@/hooks/admin/useQuotes'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText, Plus, Search, Loader2, Filter, ArrowUpDown, AlertTriangle, Download, Archive, ArrowRight, ChevronLeft, ChevronRight, X, Building2, Megaphone, SlidersHorizontal } from 'lucide-react'
import { QUOTE_STATUSES, QUOTE_STATUS_CONFIG, type QuoteStatus } from '@/lib/constants'
import { useListPageHotkeys } from '@/hooks/usePageHotkeys'
import { useClients } from '@/hooks/admin/useClients'
import { useCampaigns } from '@/hooks/useCampaigns'

type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'number'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'amount_desc', label: 'Montant décroissant' },
  { value: 'amount_asc', label: 'Montant croissant' },
  { value: 'number', label: 'Numéro' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function QuotesPage() {
  const navigate = useNavigate()
  const { data: quotes } = useQuotes() // for status counts
  const [page, setPage] = useState(0)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [campaignFilter, setCampaignFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [archiveMode, setArchiveMode] = useState<'active' | 'archived' | 'all'>('active')
  const { data: clientsList } = useClients()
  const { data: campaignsList } = useCampaigns()
  const { data: paginatedData, isLoading } = usePaginatedQuotes(
    page,
    debouncedSearch,
    statusFilter,
    sort,
    archiveMode,
    clientFilter,
    campaignFilter,
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useListPageHotkeys('/admin/quotes/new')

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
    for (const q of quotes ?? []) {
      counts[q.status] = (counts[q.status] || 0) + 1
    }
    return counts
  }, [quotes])

  const filtered = paginatedData?.quotes ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [debouncedSearch, statusFilter, sort, archiveMode, clientFilter, campaignFilter])

  const hasActiveFilters =
    !!debouncedSearch.trim() ||
    statusFilter !== 'all' ||
    clientFilter !== 'all' ||
    campaignFilter !== 'all' ||
    archiveMode !== 'active'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setClientFilter('all')
    setCampaignFilter('all')
    setArchiveMode('active')
  }

  const filteredTotal = useMemo(() => {
    return filtered.reduce((sum, q) => sum + q.total_ttc, 0)
  }, [filtered])

  function isExpired(quote: { status: string; valid_until: string | null }) {
    if (quote.status !== 'draft' && quote.status !== 'sent') return false
    if (!quote.valid_until) return false
    return new Date(quote.valid_until) < new Date()
  }

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Numéro', 'Client', 'Date', 'Validité', 'Statut', 'Total HT', 'Total TTC']
    const rows = filtered.map((q) => [
      q.quote_number,
      q.clients?.company_name ?? '',
      new Date(q.issued_at).toLocaleDateString('fr-FR'),
      q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-FR') : '',
      QUOTE_STATUS_CONFIG[q.status as QuoteStatus]?.label ?? q.status,
      q.total_ht?.toFixed(2) ?? '0.00',
      q.total_ttc?.toFixed(2) ?? '0.00',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devis-${new Date().toISOString().slice(0, 10)}.csv`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-base font-semibold sm:text-xl">Devis</h1>
          <span className="text-sm text-muted-foreground">
            <span className="sm:hidden">· </span>
            {filtered.length}{hasActiveFilters ? ` / ${quotes?.length ?? 0}` : ''}
            <span className="hidden sm:inline"> devis</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/quotes/new')}>
            <Plus className="mr-1.5 size-4" />
            Nouveau devis
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
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              <option value="all">Tous statuts ({quotes?.length ?? 0})</option>
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {QUOTE_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
          {/* Desktop only */}
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
            <Megaphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
            >
              <option value="all">Toutes campagnes</option>
              {campaignsList?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
            {((clientFilter !== 'all' ? 1 : 0) + (campaignFilter !== 'all' ? 1 : 0) + (archiveMode !== 'active' ? 1 : 0)) > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {(clientFilter !== 'all' ? 1 : 0) + (campaignFilter !== 'all' ? 1 : 0) + (archiveMode !== 'active' ? 1 : 0)}
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
            <div className="relative">
              <Megaphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
              >
                <option value="all">Toutes campagnes</option>
                {campaignsList?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
              {hasActiveFilters ? 'Aucun devis trouvé pour ces critères.' : 'Aucun devis pour le moment.'}
            </CardContent>
          </Card>
        ) : (
          filtered.map((quote) => {
            const expired = isExpired(quote)
            const statusCfg = QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]
            return (
              <button
                key={quote.id}
                onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{quote.quote_number}</span>
                  <Badge variant={statusCfg?.variant ?? 'secondary'} className={`shrink-0 ${statusCfg?.className ?? ''}`}>
                    {statusCfg?.label ?? quote.status}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {quote.clients?.company_name ?? '—'}
                  {quote.campaigns?.name ? ` · ${quote.campaigns.name}` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    {new Date(quote.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {quote.valid_until && (
                      <span className={`ml-2 ${expired ? 'font-medium text-orange-500' : ''}`}>
                        {expired && '⚠ '}
                        Exp. {new Date(quote.valid_until).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">{formatCurrency(quote.total_ttc)}</span>
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
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Campagne</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Date</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Validité</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={FileText}
                        title={hasActiveFilters ? 'Aucun devis trouvé' : 'Aucun devis pour le moment'}
                        action={!hasActiveFilters ? { label: 'Nouveau devis', onClick: () => navigate('/admin/quotes/new') } : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((quote) => {
                    const expired = isExpired(quote)
                    return (
                      <tr
                        key={quote.id}
                        onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-medium">{quote.quote_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {quote.clients?.company_name ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {quote.campaigns?.name ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {new Date(quote.issued_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {quote.valid_until ? (
                            <span className={`flex items-center gap-1 text-xs ${expired ? 'font-medium text-orange-500' : 'text-muted-foreground'}`}>
                              {expired && <AlertTriangle className="size-3" />}
                              {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.variant ?? 'secondary'} className={QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.className}>
                              {QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.label ?? quote.status}
                            </Badge>
                            {quote.status === 'accepted' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/invoices/new?from_quote=${quote.id}`) }}
                                className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                              >
                                <ArrowRight className="size-3" /> Facture
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(quote.total_ttc)}
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
            {total} devis · Total page : <span className="font-medium tabular-nums text-foreground">{formatCurrency(filteredTotal)}</span>
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
