import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, PanelTop, Search, MapPin, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  vacant: 'Vacant',
  maintenance: 'Maintenance',
  missing: 'Manquant',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  vacant: 'secondary',
  maintenance: 'outline',
  missing: 'destructive',
}

export function OperatorPanelsPage() {
  const { data: panels, isLoading } = usePanels()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!panels) return []
    if (!search.trim()) return panels
    const q = search.toLowerCase()
    return panels.filter(
      (p) =>
        p.reference.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q)
    )
  }, [panels, search])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Panneaux</h1>
        <span className="text-xs text-muted-foreground">{panels?.length ?? 0} points</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un point..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-[13px]"
        />
      </div>

      {!filtered.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <PanelTop className="size-8" strokeWidth={1} />
          <p className="mt-3 text-sm">{search ? 'Aucun résultat' : 'Aucun panneau enregistré'}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filtered.map((panel) => (
            <Link
              key={panel.id}
              to={`/panels/${panel.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium">{panel.reference}</p>
                  <Badge variant={STATUS_VARIANTS[panel.status] ?? 'secondary'} className="text-[10px] font-normal">
                    {STATUS_LABELS[panel.status] ?? panel.status}
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
          ))}
        </div>
      )}
    </div>
  )
}
