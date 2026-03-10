import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search, Filter, Loader2, PanelTop } from 'lucide-react'
import { PANEL_STATUSES, type PanelStatus } from '@/lib/constants'

export function PanelsPage() {
  const { data: panels, isLoading } = usePanels()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>('all')

  const filtered = useMemo(() => {
    if (!panels) return []
    return panels.filter((p) => {
      const matchSearch =
        !search ||
        p.reference.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [panels, search, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Panneaux</h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} panneau{filtered.length !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, nom, ville..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PanelStatus | 'all')}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {PANEL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PanelTop className="h-12 w-12" />
          <p className="mt-4">Aucun panneau trouvé</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Référence</th>
                <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Nom</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Ville</th>
                <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Format</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Mis à jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((panel) => (
                <tr key={panel.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/panels/${panel.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {panel.reference}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {panel.name || '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {panel.city || '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {panel.format || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={panel.status as PanelStatus} />
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                    {new Date(panel.updated_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
