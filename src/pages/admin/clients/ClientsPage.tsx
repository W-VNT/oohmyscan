import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients, useUpdateClient, type Client } from '@/hooks/admin/useClients'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { Building2, Plus, Search, Loader2, Filter, ArrowUpDown, Megaphone } from 'lucide-react'

type SortOption = 'name' | 'city' | 'newest' | 'oldest'
type StatusFilter = 'all' | 'active' | 'inactive'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nom A-Z' },
  { value: 'city', label: 'Ville' },
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function ClientsPage() {
  const navigate = useNavigate()
  const { data: clients, isLoading } = useClients()
  const updateClient = useUpdateClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortOption>('name')
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Campaign counts per client
  const { data: campaignCounts = new Map<string, number>() } = useQuery({
    queryKey: ['client-campaign-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('client_id')
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        if (row.client_id) {
          counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1)
        }
      }
      return counts
    },
    staleTime: 5 * 60 * 1000,
  })

  // Financial KPIs per client (CA = paid invoices, Solde = unpaid invoices)
  const { data: clientFinance } = useQuery({
    queryKey: ['client-finance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('client_id, status, total_ttc')
        .neq('status', 'cancelled')
      const map = new Map<string, { paid: number; pending: number }>()
      for (const inv of data ?? []) {
        const entry = map.get(inv.client_id) ?? { paid: 0, pending: 0 }
        if (inv.status === 'paid') entry.paid += inv.total_ttc
        else if (inv.status === 'sent' || inv.status === 'overdue') entry.pending += inv.total_ttc
        map.set(inv.client_id, entry)
      }
      return map
    },
    staleTime: 60_000,
  })

  // Debounce search
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
    if (!clients) return { active: 0, inactive: 0 }
    return {
      active: clients.filter((c) => c.is_active).length,
      inactive: clients.filter((c) => !c.is_active).length,
    }
  }, [clients])

  // Filter + search + sort
  const filtered = useMemo(() => {
    if (!clients) return []
    let result = clients

    if (statusFilter === 'active') result = result.filter((c) => c.is_active)
    if (statusFilter === 'inactive') result = result.filter((c) => !c.is_active)

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_name?.toLowerCase().includes(q) ||
          c.contact_email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name': return a.company_name.localeCompare(b.company_name, 'fr')
        case 'city': return (a.city ?? '').localeCompare(b.city ?? '', 'fr')
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default: return 0
      }
    })

    return result
  }, [clients, statusFilter, debouncedSearch, sort])

  function handleToggleActive(client: Client) {
    if (client.is_active) {
      setConfirmDeactivate(client.id)
    } else {
      updateClient.mutate({ id: client.id, is_active: true })
      toast('Client réactivé')
    }
  }

  function confirmToggle(client: Client) {
    updateClient.mutate({ id: client.id, is_active: false })
    setConfirmDeactivate(null)
    toast('Client désactivé')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Clients</h1>
          <span className="text-sm text-muted-foreground">
            {clients?.length ?? 0} client{(clients?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/clients/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouveau client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, contact, email, ville..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous ({clients?.length ?? 0})</option>
            <option value="active">Actifs ({statusCounts.active})</option>
            <option value="inactive">Inactifs ({statusCounts.inactive})</option>
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
      </div>

      {/* Table -- Columns: Societe | Contact | Ville | CA | Solde | Statut */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Société</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Contact</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Ville</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground text-right lg:table-cell">CA</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground text-right lg:table-cell">Solde</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Building2}
                        title={debouncedSearch || statusFilter !== 'all' ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
                        action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouveau client', onClick: () => navigate('/admin/clients/new') } : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => {
                    const campCount = campaignCounts.get(client.id) ?? 0
                    const finance = clientFinance?.get(client.id)
                    const ca = finance?.paid ?? 0
                    const solde = finance?.pending ?? 0
                    return (
                      <tr
                        key={client.id}
                        onClick={() => navigate(`/admin/clients/${client.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.company_name}</span>
                            {campCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title={`${campCount} campagne${campCount !== 1 ? 's' : ''}`}>
                                <Megaphone className="size-3" />
                                {campCount}
                              </span>
                            )}
                          </div>
                          {!client.is_active && (
                            <span className="text-[10px] text-muted-foreground">Inactif</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {client.contact_name || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {client.city || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                          {ca > 0 ? (
                            <span className="font-medium text-foreground">{formatCurrency(ca)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                          {solde > 0 ? (
                            <span className="font-medium text-red-600">{formatCurrency(solde)}</span>
                          ) : (
                            <span className="text-muted-foreground">0,00 €</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {confirmDeactivate === client.id ? (
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => confirmToggle(client)}
                                className="rounded px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-500/10"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setConfirmDeactivate(null)}
                                className="rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleActive(client)
                              }}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                                client.is_active
                                  ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                                  : 'bg-gray-500/15 text-gray-500 hover:bg-gray-500/25'
                              }`}
                            >
                              {client.is_active ? 'Actif' : 'Inactif'}
                            </button>
                          )}
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

      <p className="text-xs text-muted-foreground">
        {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        {(debouncedSearch || statusFilter !== 'all') && ` sur ${clients?.length ?? 0}`}
      </p>
    </div>
  )
}
