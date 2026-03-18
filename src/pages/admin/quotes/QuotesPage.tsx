import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes, usePaginatedQuotes } from '@/hooks/admin/useQuotes'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText, Plus, Search, Loader2, Filter, ArrowUpDown, AlertTriangle, Download, Archive } from 'lucide-react'
import { QUOTE_STATUSES, QUOTE_STATUS_CONFIG, type QuoteStatus } from '@/lib/constants'

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
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [showArchived, setShowArchived] = useState(false)
  const { data: paginatedData, isLoading } = usePaginatedQuotes(page, debouncedSearch, statusFilter, sort, showArchived)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

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
  useEffect(() => { setPage(0) }, [debouncedSearch, statusFilter, sort, showArchived])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Devis</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{(statusFilter !== 'all' || debouncedSearch) ? ` / ${quotes?.length ?? 0}` : ''} devis
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/quotes/new')}>
            <Plus className="mr-1.5 size-4" />
            Nouveau devis
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par numéro ou client..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les statuts ({quotes?.length ?? 0})</option>
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
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
          onClick={() => setShowArchived((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${showArchived ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:text-foreground'}`}
        >
          <Archive className="size-3.5" />
          Archives
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Numéro</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Date</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Validité</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={FileText}
                        title={debouncedSearch || statusFilter !== 'all' ? 'Aucun devis trouvé' : 'Aucun devis pour le moment'}
                        action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouveau devis', onClick: () => navigate('/admin/quotes/new') } : undefined}
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
                          <Badge variant={QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.variant ?? 'secondary'}>
                            {QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.label ?? quote.status}
                          </Badge>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total} devis · Total page : {formatCurrency(filteredTotal)}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-input px-2 py-1 text-xs disabled:opacity-50"
              >
                ←
              </button>
              <span>{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-input px-2 py-1 text-xs disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
