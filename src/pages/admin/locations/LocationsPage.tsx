import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLocations } from '@/hooks/useLocations'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Landmark, Search, Loader2, Filter, ArrowUpDown, PanelTop, FileCheck, Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  const hasActiveFilters = !!debouncedSearch.trim() || contractFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setContractFilter('all')
  }

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

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Nom', 'Adresse', 'Code Postal', 'Ville', 'Téléphone', 'Bailleur', 'Email', 'Contrat', 'Panneaux']
    const rows = filtered.map((loc) => [
      loc.name,
      loc.address,
      loc.postal_code,
      loc.city,
      loc.phone ?? '',
      `${loc.owner_first_name} ${loc.owner_last_name}`,
      loc.owner_email ?? '',
      loc.has_contract ? 'Oui' : 'Non',
      String(panelCounts?.get(loc.id) ?? 0),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lieux-${new Date().toISOString().slice(0, 10)}.csv`
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-base font-semibold sm:text-xl">Lieux</h1>
          <span className="text-sm text-muted-foreground">
            <span className="sm:hidden">· </span>
            {filtered.length}
            {hasActiveFilters && ` / ${locations?.length ?? 0}`}
            <span className="hidden sm:inline"> lieu{(hasActiveFilters ? (locations?.length ?? 0) : filtered.length) !== 1 ? 'x' : ''}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Filters : search + 2 selects en grid 2 cols sur mobile */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, ville, adresse, bailleur..."
            className="h-10 pl-9 text-sm sm:h-9 sm:min-w-[240px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value as ContractFilter)}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
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
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
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

      {/* Mobile : cards stack */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <Card className="py-0">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Aucun lieu trouvé pour ces critères.'
                : "Les lieux sont créés sur le terrain par les opérateurs lors de la pose de panneaux."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((location) => {
            const panelCount = panelCounts.get(location.id) ?? 0
            return (
              <button
                key={location.id}
                onClick={() => navigate(`/admin/locations/${location.id}`)}
                className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{location.name}</span>
                  {location.has_contract ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600">
                      <FileCheck className="size-3" />
                      Signé
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-600">
                      Non signé
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {location.city} {location.postal_code}
                </p>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{location.owner_first_name} {location.owner_last_name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                    <PanelTop className="size-3" />
                    {panelCount}
                  </span>
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
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Ville</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Bailleur</th>
                  <th className="px-4 py-3 text-center font-medium">Panneaux</th>
                  <th className="px-4 py-3 text-center font-medium">Contrat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12">
                      {hasActiveFilters ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Landmark className="size-8" />
                          <p>Aucun lieu trouvé</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                            <Landmark className="size-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium">Aucun lieu pour le moment</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                              Les lieux sont créés sur le terrain par les opérateurs lors de la
                              pose de panneaux, via l'app mobile <span className="font-['Poppins'] font-black uppercase tracking-[0.02em]">OOH MY SCAN</span>.
                            </p>
                          </div>
                          <Link
                            to="/app/dashboard"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-muted"
                          >
                            <Smartphone className="size-4" />
                            Mode terrain
                          </Link>
                        </div>
                      )}
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
                          <Link
                            to={`/admin/panels?location=${location.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <PanelTop className="size-3" />
                            {panelCount}
                          </Link>
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

    </div>
  )
}
