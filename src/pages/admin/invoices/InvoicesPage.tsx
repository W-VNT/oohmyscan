import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Plus, Search, Loader2 } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyée', variant: 'default' },
  paid: { label: 'Payée', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const { data: invoices, isLoading } = useInvoices()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!invoices) return []
    let result = invoices
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.clients?.company_name.toLowerCase().includes(q),
      )
    }
    return result
  }, [invoices, search, statusFilter])

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
        <h1 className="text-xl font-semibold">Factures</h1>
        <Button onClick={() => navigate('/admin/invoices/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouvelle facture
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
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Toutes' : statusConfig[s]?.label ?? s}
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
                      {search || statusFilter !== 'all' ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
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
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {new Date(inv.due_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[inv.status]?.variant ?? 'secondary'}>
                          {statusConfig[inv.status]?.label ?? inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(inv.total_ttc)}
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
        {filtered.length} facture{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
