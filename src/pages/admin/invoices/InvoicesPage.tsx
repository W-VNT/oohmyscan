import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Plus, Search, Loader2, Filter, ArrowUpDown, AlertTriangle, Clock } from 'lucide-react'
import { INVOICE_STATUSES, INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/lib/constants'

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
  const { data: invoices, isLoading } = useInvoices()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('newest')
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
    for (const inv of invoices ?? []) {
      counts[inv.status] = (counts[inv.status] || 0) + 1
    }
    return counts
  }, [invoices])

  const filtered = useMemo(() => {
    if (!invoices) return []
    let result = invoices

    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.clients?.company_name.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        case 'oldest': return new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()
        case 'due_date': return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
        case 'amount_desc': return b.total_ttc - a.total_ttc
        case 'amount_asc': return a.total_ttc - b.total_ttc
        case 'number': return a.invoice_number.localeCompare(b.invoice_number)
        default: return 0
      }
    })

    return result
  }, [invoices, debouncedSearch, statusFilter, sort])

  const filteredTotal = useMemo(() => {
    return filtered.reduce((sum, inv) => sum + inv.total_ttc, 0)
  }, [filtered])

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
          <h1 className="text-xl font-semibold">Factures</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{(statusFilter !== 'all' || debouncedSearch) ? ` / ${invoices?.length ?? 0}` : ''} facture{(invoices?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onClick={() => navigate('/admin/invoices/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par numéro ou client..."
            className="pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les statuts ({invoices?.length ?? 0})</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
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
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Échéance</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 size-8" />
                      {debouncedSearch || statusFilter !== 'all' ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
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
                        <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
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
                          <Badge variant={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.variant ?? 'secondary'}>
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

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} facture{filtered.length !== 1 ? 's' : ''}{(debouncedSearch || statusFilter !== 'all') && ` sur ${invoices?.length ?? 0}`}
          </span>
          <span className="font-medium">
            Total : {formatCurrency(filteredTotal)}
          </span>
        </div>
      )}
    </div>
  )
}
