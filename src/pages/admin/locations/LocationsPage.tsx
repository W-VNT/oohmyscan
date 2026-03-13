import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocations } from '@/hooks/useLocations'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Landmark, Search, Loader2, Filter, ArrowUpDown, PanelTop, FileCheck } from 'lucide-react'

type SortOption = 'name' | 'city' | 'newest'
type ContractFilter = 'all' | 'with_contract' | 'without_contract'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nom A-Z' },
  { value: 'city', label: 'Ville' },
  { value: 'newest', label: 'Plus récents' },
]

export function LocationsPage() {
  const navigate = useNavigate()
  const { data: locations, isLoading } = useLocations()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all')
  const [sort, setSort] = useState<SortOption>('name')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Panel counts per location
  const { data: panelCounts = new Map<string, number>() } = useQuery({
    queryKey: ['location-panel-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('panels')
        .select('location_id')
        .not('location_id', 'is', null)
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        if (row.location_id) {
          counts.set(row.location_id, (counts.get(row.location_id) ?? 0) + 1)
        }
      }
      return counts
    },
    staleTime: 5 * 60 * 1000,
  })

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

  const statusCounts = useMemo(() => {
    if (!locations) return { withContract: 0, withoutContract: 0 }
    return {
      withContract: locations.filter((l) => l.has_contract).length,
      withoutContract: locations.filter((l) => !l.has_contract).length,
    }
  }, [locations])

  const filtered = useMemo(() => {
    if (!locations) return []
    let result = locations

    if (contractFilter === 'with_contract') result = result.filter((l) => l.has_contract)
    if (contractFilter === 'without_contract') result = result.filter((l) => !l.has_contract)

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.owner_last_name.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name, 'fr')
        case 'city': return a.city.localeCompare(b.city, 'fr')
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return 0
      }
    })

    return result
  }, [locations, contractFilter, debouncedSearch, sort])

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
          <h1 className="text-xl font-semibold">Lieux</h1>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            <span>{locations?.length ?? 0} lieu{(locations?.length ?? 0) !== 1 ? 'x' : ''}</span>
            <span>·</span>
            <span>{statusCounts.withContract} avec contrat</span>
            <span>·</span>
            <span>{statusCounts.withoutContract} sans contrat</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, ville, adresse, bailleur..."
            className="pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value as ContractFilter)}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous ({locations?.length ?? 0})</option>
            <option value="with_contract">Avec contrat ({statusCounts.withContract})</option>
            <option value="without_contract">Sans contrat ({statusCounts.withoutContract})</option>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nom</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Ville</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Bailleur</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Panneaux</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Contrat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <Landmark className="mx-auto mb-2 size-8" />
                      {debouncedSearch || contractFilter !== 'all' ? 'Aucun lieu trouvé' : 'Aucun lieu pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((location) => {
                    const panelCount = panelCounts.get(location.id) ?? 0
                    return (
                      <tr
                        key={location.id}
                        onClick={() => navigate(`/admin/locations/${location.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">{location.name}</span>
                          <p className="text-xs text-muted-foreground md:hidden">{location.city}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {location.city} {location.postal_code}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {location.owner_first_name} {location.owner_last_name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <PanelTop className="size-3" />
                            {panelCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {location.has_contract ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-medium text-green-600">
                              <FileCheck className="size-3" />
                              Signé
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-medium text-orange-600">
                              Non signé
                            </span>
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
        {filtered.length} lieu{filtered.length !== 1 ? 'x' : ''}
        {(debouncedSearch || contractFilter !== 'all') && ` sur ${locations?.length ?? 0}`}
      </p>
    </div>
  )
}
