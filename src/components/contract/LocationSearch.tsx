import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, MapPin, FileCheck, AlertTriangle, Plus, PanelTop, Loader2 } from 'lucide-react'
import { useSearchLocations } from '@/hooks/useLocations'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/types'

interface LocationSearchProps {
  onSelect: (location: Location) => void
  onCreateNew: () => void
}

export function LocationSearch({ onSelect, onCreateNew }: LocationSearchProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const { data: results, isLoading } = useSearchLocations(debouncedSearch)

  // Panel counts for results
  const locationIds = results?.map((l) => l.id) ?? []
  const { data: panelCounts = new Map<string, number>() } = useQuery({
    queryKey: ['location-panel-counts-search', locationIds],
    queryFn: async () => {
      if (!locationIds.length) return new Map<string, number>()
      const { data } = await supabase
        .from('panels')
        .select('location_id')
        .in('location_id', locationIds)
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        if (row.location_id) {
          counts.set(row.location_id, (counts.get(row.location_id) ?? 0) + 1)
        }
      }
      return counts
    },
    enabled: locationIds.length > 0,
  })

  const handleChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Ce lieu existe-t-il déjà ?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Recherchez par nom ou ville pour éviter les doublons
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Rechercher par nom ou ville..."
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground"
          autoFocus
        />
        {isLoading && debouncedSearch.length >= 1 && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {debouncedSearch.length >= 1 ? (
        <div className="space-y-2">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          ) : results && results.length > 0 ? (
            results.map((location) => {
              const panelCount = panelCounts.get(location.id) ?? 0
              const addressParts = [location.address, location.postal_code, location.city].filter(Boolean)
              return (
                <button
                  key={location.id}
                  onClick={() => onSelect(location)}
                  className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{location.name}</p>
                      {addressParts.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {addressParts.join(', ')}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        {location.has_contract ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <FileCheck className="size-3" />
                            Contrat signé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-orange-500">
                            <AlertTriangle className="size-3" />
                            Pas de contrat
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <PanelTop className="size-3" />
                          {panelCount} panneau{panelCount !== 1 ? 'x' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {debouncedSearch} »
            </div>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Tapez le nom du lieu pour rechercher
        </p>
      )}

      {/* Create new */}
      <button
        onClick={onCreateNew}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-4" />
        Créer un nouveau lieu
      </button>
    </div>
  )
}
