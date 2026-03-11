import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes } from '@/hooks/admin/useQuotes'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Search, Loader2 } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyé', variant: 'default' },
  accepted: { label: 'Accepté', variant: 'default' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  cancelled: { label: 'Annulé', variant: 'outline' },
}

export function QuotesPage() {
  const navigate = useNavigate()
  const { data: quotes, isLoading } = useQuotes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!quotes) return []
    let result = quotes
    if (statusFilter !== 'all') {
      result = result.filter((q) => q.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (quote) =>
          quote.quote_number.toLowerCase().includes(q) ||
          quote.clients?.company_name.toLowerCase().includes(q),
      )
    }
    return result
  }, [quotes, search, statusFilter])

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
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
        <h1 className="text-xl font-semibold">Devis</h1>
        <Button onClick={() => navigate('/admin/quotes/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouveau devis
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Tous' : statusConfig[s]?.label ?? s}
            </button>
          ))}
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
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-2 size-8" />
                      {search || statusFilter !== 'all' ? 'Aucun devis trouvé' : 'Aucun devis pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((quote) => (
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
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[quote.status]?.variant ?? 'secondary'}>
                          {statusConfig[quote.status]?.label ?? quote.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(quote.total_ttc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filtered.length} devis{filtered.length !== 1 ? '' : ''}
      </p>
    </div>
  )
}
