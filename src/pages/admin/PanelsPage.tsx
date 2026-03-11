import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Loader2, PanelTop, ChevronLeft, ChevronRight } from 'lucide-react'
import { PANEL_STATUSES, type PanelStatus } from '@/lib/constants'
import { usePanelFormats } from '@/hooks/admin/usePanelFormats'
import type { Panel } from '@/types'

const PAGE_SIZE = 25

function usePaginatedPanels(
  page: number,
  search: string,
  status: PanelStatus | 'all',
  format: string,
  sortCol: string,
  sortAsc: boolean,
) {
  return useQuery({
    queryKey: ['panels-paginated', page, search, status, format, sortCol, sortAsc],
    queryFn: async () => {
      let query = supabase
        .from('panels')
        .select('*', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (search.trim()) {
        const q = `%${search.trim()}%`
        query = query.or(`reference.ilike.${q},city.ilike.${q},name.ilike.${q},address.ilike.${q}`)
      }
      if (status !== 'all') query = query.eq('status', status)
      if (format) query = query.eq('format', format)

      const { data, error, count } = await query
      if (error) throw error
      return { panels: data as Panel[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}

type SortCol = 'reference' | 'city' | 'format' | 'status' | 'updated_at'

export function PanelsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('reference')
  const [sortAsc, setSortAsc] = useState(true)

  const { data: panelFormats } = usePanelFormats()
  const { data, isLoading } = usePaginatedPanels(page, search, statusFilter, formatFilter, sortCol, sortAsc)

  const panels = data?.panels ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Reset page on filter change
  function resetPage() { setPage(0) }

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
    resetPage()
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return null
    return <span className="ml-1 text-xs">{sortAsc ? '↑' : '↓'}</span>
  }

  const formats = useMemo(() => {
    return panelFormats?.filter((f) => f.is_active).map((f) => f.name) ?? []
  }, [panelFormats])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Panneaux</h2>
        <span className="text-sm text-muted-foreground">
          {total} panneau{total !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            placeholder="Rechercher par référence, nom, ville..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as PanelStatus | 'all'); resetPage() }}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {PANEL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <select
          value={formatFilter}
          onChange={(e) => { setFormatFilter(e.target.value); resetPage() }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous les formats</option>
          {formats.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading && page === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : panels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PanelTop className="h-12 w-12" />
          <p className="mt-4">Aucun panneau trouvé</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="cursor-pointer px-4 py-3 text-left font-medium" onClick={() => handleSort('reference')}>
                    Référence<SortIcon col="reference" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('city')}>
                    Ville<SortIcon col="city" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium lg:table-cell" onClick={() => handleSort('format')}>
                    Format<SortIcon col="format" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left font-medium" onClick={() => handleSort('status')}>
                    Statut<SortIcon col="status" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('updated_at')}>
                    Mis à jour<SortIcon col="updated_at" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {panels.map((panel) => (
                  <tr key={panel.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/panels/${panel.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {panel.reference}
                      </Link>
                      <p className="text-xs text-muted-foreground sm:hidden">{panel.city || '—'}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} / {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
