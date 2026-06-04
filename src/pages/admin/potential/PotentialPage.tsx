import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePotentialRequests } from '@/hooks/admin/usePotentialRequests'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Loader2, Filter, ArrowUpDown, SearchCheck, X, Store } from 'lucide-react'
import { POTENTIAL_STATUSES, POTENTIAL_STATUS_CONFIG, type PotentialStatus } from '@/lib/constants'
import { SUPPORT_TYPES, BUSINESS_TYPES, type BusinessType } from '@/lib/potential-search'

type SortOption = 'newest' | 'oldest' | 'prospect' | 'city'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'prospect', label: 'Prospect A→Z' },
  { value: 'city', label: 'Ville A→Z' },
]

export function PotentialPage() {
  const navigate = useNavigate()
  const { data: requests, isLoading } = usePotentialRequests()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PotentialStatus | 'all'>('all')
  const [businessFilter, setBusinessFilter] = useState<BusinessType | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const req of requests ?? []) {
      counts[req.status] = (counts[req.status] || 0) + 1
    }
    return counts
  }, [requests])

  const hasActiveFilters = !!debouncedSearch.trim() || statusFilter !== 'all' || businessFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setBusinessFilter('all')
  }

  const filtered = useMemo(() => {
    if (!requests) return []
    let result = requests

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    if (businessFilter !== 'all') {
      result = result.filter((r) => {
        const rr = r as typeof r & { business_type?: string | null }
        return rr.business_type === businessFilter
      })
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (r) =>
          r.prospect_name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'prospect': return a.prospect_name.localeCompare(b.prospect_name)
        case 'city': return a.city.localeCompare(b.city)
        default: return 0
      }
    })

    return result
  }, [requests, debouncedSearch, statusFilter, businessFilter, sort])

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Potentiel</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{hasActiveFilters ? ` / ${requests?.length ?? 0}` : ''} demande{(requests?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/potential/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par prospect, ville ou référence..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PotentialStatus | 'all')}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous statuts ({requests?.length ?? 0})</option>
            {POTENTIAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POTENTIAL_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value as BusinessType | 'all')}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Toutes typologies</option>
            {BUSINESS_TYPES.filter((b) => b.value !== 'all').map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Référence</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Prospect</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Ville</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Typologie</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Rayon</th>
                  <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">Vacants</th>
                  <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">Potentiels</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12">
                      {hasActiveFilters ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <SearchCheck className="size-8" />
                          <p>Aucune demande trouvée</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                            <SearchCheck className="size-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium">Aucune demande de potentiel</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                              Génère une analyse de potentiel sur une zone géographique pour
                              identifier les emplacements stratégiques d'un prospect.
                            </p>
                          </div>
                          <Button size="sm" onClick={() => navigate('/admin/potential/new')}>
                            <Plus className="mr-1.5 size-4" />
                            Nouvelle demande
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/admin/potential/${req.id}`)}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium font-mono text-xs">{req.reference}</td>
                      <td className="px-4 py-3 font-medium">{req.prospect_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{req.city}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {(() => {
                          const r = req as typeof req & { business_type?: string | null }
                          if (r.business_type) {
                            return BUSINESS_TYPES.find((b) => b.value === r.business_type)?.label ?? '—'
                          }
                          // Fallback : ancienne fiche avec uniquement support_type
                          return SUPPORT_TYPES.find((s) => s.value === req.support_type)?.label ?? '—'
                        })()}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{req.radius_km} km</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                        <span className="text-blue-600 font-medium">{req.existing_panels_count}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                        <span className="text-orange-600 font-medium">{req.potential_spots_count}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={POTENTIAL_STATUS_CONFIG[req.status]?.variant ?? 'secondary'}>
                          {POTENTIAL_STATUS_CONFIG[req.status]?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
