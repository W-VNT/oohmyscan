import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/shared/EmptyState'
import { Search, Filter, Loader2, PanelTop, ChevronLeft, ChevronRight, Megaphone, Download, MapPin, X, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PANEL_STATUSES, PANEL_STATUS_CONFIG, type PanelStatus } from '@/lib/constants'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { usePanelStats } from '@/hooks/admin/useDashboardStats'
import type { PanelWithLocation } from '@/types'

const PAGE_SIZE = 25

function usePaginatedPanels(
  page: number,
  debouncedSearch: string,
  status: PanelStatus | 'all',
  format: string,
  sortCol: string,
  sortAsc: boolean,
  locationFilter: 'all' | 'with' | 'without',
  campaignFilter: 'all' | 'with' | 'without',
  activeCampaignPanelIds: string[],
) {
  return useQuery({
    queryKey: [
      'panels-paginated',
      page,
      debouncedSearch,
      status,
      format,
      sortCol,
      sortAsc,
      locationFilter,
      campaignFilter,
      activeCampaignPanelIds.length,
    ],
    queryFn: async () => {
      // Court-circuit pour campaignFilter='with' avec liste vide
      if (campaignFilter === 'with' && activeCampaignPanelIds.length === 0) {
        return { panels: [] as PanelWithLocation[], total: 0 }
      }

      let query = supabase
        .from('panels')
        .select('*, locations(name)', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })

      if (debouncedSearch.trim()) {
        const escaped = debouncedSearch.trim()
          .replace(/[%_\\]/g, (c) => `\\${c}`)
          .replace(/[,()]/g, '')
        const q = `%${escaped}%`
        query = query.or(`reference.ilike.${q},city.ilike.${q},name.ilike.${q},address.ilike.${q}`)
      }
      if (status !== 'all') query = query.eq('status', status)
      if (format) query = query.eq('type', format)

      // Filtre lieu cote serveur
      if (locationFilter === 'with') query = query.not('location_id', 'is', null)
      else if (locationFilter === 'without') query = query.is('location_id', null)

      // Filtre campagne cote serveur via la liste active
      if (campaignFilter === 'with') {
        query = query.in('id', activeCampaignPanelIds)
      } else if (campaignFilter === 'without' && activeCampaignPanelIds.length > 0) {
        query = query.not('id', 'in', `(${activeCampaignPanelIds.join(',')})`)
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { panels: data as unknown as PanelWithLocation[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}

type SortCol = 'updated_at' | 'reference' | 'city' | 'format' | 'status'

export function PanelsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'with' | 'without'>('all')
  const [locationFilter, setLocationFilter] = useState<'all' | 'with' | 'without'>('all')
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
  const { data: panelStats } = usePanelStats()

  const activeCampaignIds = useMemo(() => Array.from(panelCampaigns), [panelCampaigns])
  const { data, isLoading } = usePaginatedPanels(
    page,
    debouncedSearch,
    statusFilter,
    formatFilter,
    sortCol,
    sortAsc,
    locationFilter,
    campaignFilter,
    activeCampaignIds,
  )

  const panels = data?.panels ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const grandTotal = panelStats?.total ?? 0

  const hasActiveFilters =
    !!debouncedSearch.trim() ||
    statusFilter !== 'all' ||
    formatFilter !== '' ||
    campaignFilter !== 'all' ||
    locationFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setFormatFilter('')
    setCampaignFilter('all')
    setLocationFilter('all')
    setPage(0)
  }

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
    const headers = ['Nom', 'Référence', 'Ville', 'Adresse', 'Latitude', 'Longitude', 'Lieu', 'Type', 'Statut', 'Campagne', 'Mis à jour']
    const rows = panels.map((p) => [
      p.name || '',
      p.reference,
      p.city || '',
      p.address || '',
      p.lat != null ? String(p.lat) : '',
      p.lng != null ? String(p.lng) : '',
      p.locations?.name || '',
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Panneaux</h1>
          <span className="text-sm text-muted-foreground">
            {total}
            {hasActiveFilters && ` / ${grandTotal}`} panneau{(hasActiveFilters ? grandTotal : total) !== 1 ? 'x' : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/map" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-muted">
            <MapPin className="size-4" /> Voir sur carte
          </Link>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!panels.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/qr')}>
            <QrCode className="mr-1.5 size-3.5" /> Générer QR
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, ville, référence..."
            className="flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as PanelStatus | 'all'); resetPage() }}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous statuts ({grandTotal})</option>
            {PANEL_STATUSES.map((s) => {
              const count =
                s === 'active' ? panelStats?.active :
                s === 'vacant' ? panelStats?.vacant :
                s === 'maintenance' ? panelStats?.maintenance :
                s === 'missing' ? panelStats?.missing : undefined
              return (
                <option key={s} value={s}>
                  {PANEL_STATUS_CONFIG[s].label}
                  {count !== undefined ? ` (${count})` : ''}
                </option>
              )
            })}
          </select>
        </div>
        <select
          value={locationFilter}
          onChange={(e) => { setLocationFilter(e.target.value as 'all' | 'with' | 'without'); resetPage() }}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Lieu : tous</option>
          <option value="with">Avec lieu</option>
          <option value="without">Sans lieu</option>
        </select>
        <select
          value={campaignFilter}
          onChange={(e) => { setCampaignFilter(e.target.value as 'all' | 'with' | 'without'); resetPage() }}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Campagne : tous</option>
          <option value="with">Avec campagne</option>
          <option value="without">Sans campagne</option>
        </select>
        <select
          value={formatFilter}
          onChange={(e) => { setFormatFilter(e.target.value); resetPage() }}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous types</option>
          {typeNames.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
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

      {/* List */}
      {isLoading && page === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : panels.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState icon={PanelTop} title="Aucun panneau trouvé" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
              <PanelTop className="size-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Aucun panneau pour le moment</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Les panneaux sont créés sur le terrain quand un opérateur scanne un QR code.
                Commence par en générer.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/admin/qr')}>
              <QrCode className="mr-1.5 size-3.5" />
              Générer des QR codes
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="cursor-pointer px-4 py-3 text-left font-medium" onClick={() => handleSort('reference')}>
                    Panneau<SortIcon col="reference" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('status')}>
                    Statut<SortIcon col="status" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('city')}>
                    Ville<SortIcon col="city" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium lg:table-cell" onClick={() => handleSort('format')}>
                    Type<SortIcon col="format" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('reference')}>
                    Référence<SortIcon col="reference" />
                  </th>
                  <th className="hidden cursor-pointer px-4 py-3 text-left font-medium sm:table-cell" onClick={() => handleSort('updated_at')}>
                    Mis à jour<SortIcon col="updated_at" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {panels.map((panel) => (
                  <tr key={panel.id} onClick={() => navigate(`/admin/panels/${panel.id}`)} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {panel.locations?.name || panel.name || panel.reference}
                        </span>
                        {panelCampaigns.has(panel.id) && (
                          <span title="Campagne active"><Megaphone className="size-3.5 shrink-0 text-blue-500" /></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:hidden">
                        <StatusBadge status={panel.status as PanelStatus} />
                        <span className="text-xs text-muted-foreground">{panel.city}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <StatusBadge status={panel.status as PanelStatus} />
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {panel.city || '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {panel.type || '—'}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <code className="font-mono text-xs text-muted-foreground">{panel.reference}</code>
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
