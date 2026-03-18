import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/shared/EmptyState'
import { Search, Filter, Loader2, PanelTop, ChevronLeft, ChevronRight, Megaphone, Download } from 'lucide-react'
import { PANEL_STATUSES, PANEL_STATUS_CONFIG, type PanelStatus } from '@/lib/constants'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import type { PanelWithLocation } from '@/types'

const PAGE_SIZE = 25

function usePaginatedPanels(
  page: number,
  debouncedSearch: string,
  status: PanelStatus | 'all',
  format: string,
  sortCol: string,
  sortAsc: boolean,
) {
  return useQuery({
    queryKey: ['panels-paginated', page, debouncedSearch, status, format, sortCol, sortAsc],
    queryFn: async () => {
      let query = supabase
        .from('panels')
        .select('*, locations(name)', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (debouncedSearch.trim()) {
        const escaped = debouncedSearch.trim()
          .replace(/[%_\\]/g, (c) => `\\${c}`)
          .replace(/[,()]/g, '')
        const q = `%${escaped}%`
        query = query.or(`reference.ilike.${q},city.ilike.${q},name.ilike.${q},address.ilike.${q}`)
      }
      if (status !== 'all') query = query.eq('status', status)
      if (format) query = query.eq('type', format)

      const { data, error, count } = await query
      if (error) throw error
      return { panels: data as unknown as PanelWithLocation[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}

type SortCol = 'updated_at' | 'reference' | 'city' | 'format' | 'status'

export function PanelsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('updated_at')
  const [sortAsc, setSortAsc] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Campaign indicator
  const { data: panelCampaigns = new Set<string>() } = useQuery({
    queryKey: ['active-campaign-panels'],
    queryFn: async () => {
      const { data } = await supabase
        .from('panel_campaigns')
        .select('panel_id')
        .is('unassigned_at', null)
      return new Set((data ?? []).map((d) => d.panel_id))
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: panelTypes } = usePanelTypes()
  const { data, isLoading } = usePaginatedPanels(page, debouncedSearch, statusFilter, formatFilter, sortCol, sortAsc)

  const panels = data?.panels ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(0)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function resetPage() { setPage(0) }

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(col === 'updated_at' ? false : true) }
    resetPage()
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return null
    return <span className="ml-1 text-xs">{sortAsc ? '↑' : '↓'}</span>
  }

  const typeNames = useMemo(() => {
    return panelTypes?.filter((t) => t.is_active).map((t) => t.name) ?? []
  }, [panelTypes])

  // CSV export
  function handleExportCSV() {
    if (!panels.length) return
    const headers = ['Nom', 'Référence', 'Ville', 'Adresse', 'Type', 'Statut', 'Campagne', 'Mis à jour']
    const rows = panels.map((p) => [
      p.name || '',
      p.reference,
      p.city || '',
      p.address || '',
      p.type || '',
      PANEL_STATUS_CONFIG[p.status as PanelStatus]?.label ?? p.status,
      panelCampaigns.has(p.id) ? 'Oui' : 'Non',
      new Date(p.updated_at).toLocaleDateString('fr-FR'),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `panneaux-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/qr"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-accent"
          >
            Générer des QR
          </Link>
          <button
            onClick={handleExportCSV}
            disabled={!panels.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Download className="size-3.5" />
            CSV
          </button>
        </div>
        <span className="text-sm text-muted-foreground">
          {total} panneau{total !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, ville, référence..."
            className="flex h-9 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as PanelStatus | 'all'); resetPage() }}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {PANEL_STATUSES.map((s) => (
              <option key={s} value={s}>{PANEL_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <select
          value={formatFilter}
          onChange={(e) => { setFormatFilter(e.target.value); resetPage() }}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous les types</option>
          {typeNames.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading && page === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : panels.length === 0 ? (
        <EmptyState
          icon={PanelTop}
          title={debouncedSearch || statusFilter !== 'all' || formatFilter ? 'Aucun panneau trouvé' : 'Aucun panneau'}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="cursor-pointer px-4 py-3 text-left font-medium" onClick={() => handleSort('reference')}>
                    Panneau<SortIcon col="reference" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('city')}>
                    Ville<SortIcon col="city" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium lg:table-cell" onClick={() => handleSort('format')}>
                    Type<SortIcon col="format" />
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
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/panels/${panel.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {panel.locations?.name || panel.name || panel.reference}
                        </Link>
                        {panelCampaigns.has(panel.id) && (
                          <span title="Campagne active"><Megaphone className="size-3.5 shrink-0 text-red-500" /></span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground sm:hidden">{panel.city || '—'}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {panel.city || '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {panel.type || '—'}
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
                {rangeStart}–{rangeEnd} sur {total}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
