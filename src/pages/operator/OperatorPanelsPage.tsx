import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useInfinitePanels } from '@/hooks/usePanels'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelTop, Search, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { PANEL_STATUS_CONFIG } from '@/lib/constants'
import type { PanelStatus } from '@/lib/constants'

export function OperatorPanelsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search to avoid spamming Supabase
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitePanels(debouncedSearch)

  const panels = data?.pages.flat() ?? []
  const totalCount = panels.length + (hasNextPage ? '+' : '')

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [handleObserver])

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Panneaux</h1>
        <span className="text-xs text-muted-foreground">{totalCount} points</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un point..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-base"
        />
      </div>

      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-4 rounded" />
            </div>
          ))}
        </div>
      ) : !panels.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <PanelTop className="size-8" strokeWidth={1} />
          <p className="mt-3 text-sm">{search ? 'Aucun résultat' : 'Aucun panneau enregistré'}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {panels.map((panel) => {
            const cfg = PANEL_STATUS_CONFIG[panel.status as PanelStatus]
            return (
              <Link
                key={panel.id}
                to={`/panels/${panel.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium">{panel.reference}</p>
                    <Badge variant={cfg?.variant ?? 'secondary'} className="text-[10px] font-normal">
                      {cfg?.label ?? panel.status}
                    </Badge>
                  </div>
                  {(panel.city || panel.name) && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      <span className="truncate">{panel.city || panel.name}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
              </Link>
            )
          })}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
