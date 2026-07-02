import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCampaigns, useDeleteCampaign } from '@/hooks/useCampaigns'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Megaphone, Search, Filter, ArrowUpDown, Download, X, AlertTriangle, Building2, SlidersHorizontal, MoreVertical, Trash2 } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { saveAs } from 'file-saver'
import { toast } from '@/components/shared/Toast'
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_CONFIG, type CampaignStatus } from '@/lib/constants'
import { useListPageHotkeys } from '@/hooks/usePageHotkeys'

type SortOption = 'newest' | 'oldest' | 'name' | 'start_date' | 'end_date'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'name', label: 'Nom A-Z' },
  { value: 'start_date', label: 'Date début' },
  { value: 'end_date', label: 'Date fin' },
]

export function CampaignsPage() {
  const { data: campaigns, isLoading, isError, error, refetch } = useCampaigns()
  const navigate = useNavigate()
  const deleteCampaign = useDeleteCampaign()
  const confirm = useConfirm()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    setOpenMenuId(null)
    const ok = await confirm({
      title: `Supprimer "${name}" ?`,
      description:
        'La campagne, ses visuels, assignations panneaux et dépôts seront supprimés définitivement. Devis et factures liés seront conservés (dé-liés). Action irréversible.',
      confirmLabel: 'Supprimer définitivement',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteCampaign.mutateAsync(id)
      toast('Campagne supprimée')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur lors de la suppression', 'error')
    }
  }

  const [search, setSearch] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useListPageHotkeys('/admin/campaigns/new')

  // Panel counts per campaign
  const { data: panelCounts = new Map<string, number>() } = useQuery({
    queryKey: ['campaign-panel-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('panel_campaigns')
        .select('campaign_id')
        .is('unassigned_at', null)
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1)
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
    const counts: Record<string, number> = {}
    for (const c of campaigns ?? []) {
      counts[c.status] = (counts[c.status] || 0) + 1
    }
    return counts
  }, [campaigns])

  const uniqueClients = useMemo(() => {
    if (!campaigns) return []
    const map = new Map<string, string>()
    for (const c of campaigns) {
      if (c.client_id && c.clients?.company_name) {
        map.set(c.client_id, c.clients.company_name)
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [campaigns])

  const hasActiveFilters = !!debouncedSearch.trim() || statusFilter !== 'all' || clientFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setClientFilter('all')
  }

  const filtered = useMemo(() => {
    if (!campaigns) return []
    let result = campaigns

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (clientFilter !== 'all') {
      result = result.filter((c) => c.client_id === clientFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter((c) => {
        const clientName = c.clients?.company_name ?? ''
        return (
          c.name.toLowerCase().includes(q) ||
          clientName?.toLowerCase().includes(q)
        )
      })
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name': return a.name.localeCompare(b.name, 'fr')
        case 'start_date': return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        case 'end_date': return new Date(a.end_date ?? '9999-12-31').getTime() - new Date(b.end_date ?? '9999-12-31').getTime()
        default: return 0
      }
    })

    return result
  }, [campaigns, statusFilter, clientFilter, debouncedSearch, sort])

  function isOverdue(c: { end_date: string | null; status: string }): boolean {
    if (c.status === 'completed' || c.status === 'archived' || c.status === 'cancelled') return false
    if (!c.end_date) return false
    return new Date(c.end_date).getTime() < Date.now()
  }

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Nom', 'Client', 'Statut', 'Début', 'Fin', 'Panneaux posés', 'Cible', 'Budget']
    const rows = filtered.map((c) => [
      c.name,
      c.clients?.company_name ?? '',
      CAMPAIGN_STATUS_CONFIG[c.status as CampaignStatus]?.label ?? c.status,
      new Date(c.start_date).toLocaleDateString('fr-FR'),
      c.end_date ? new Date(c.end_date).toLocaleDateString('fr-FR') : 'en cours',
      String(panelCounts.get(c.id) ?? 0),
      c.target_panel_count != null ? String(c.target_panel_count) : '',
      c.budget != null ? String(c.budget) : '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    saveAs(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
      `campagnes-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    toast('CSV exporté')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-base font-semibold sm:text-xl">Campagnes</h1>
          <span className="text-sm text-muted-foreground">
            <span className="sm:hidden">· </span>
            {filtered.length}{hasActiveFilters ? ` / ${campaigns?.length ?? 0}` : ''}
            <span className="hidden sm:inline"> campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="mr-1.5 size-3.5" /> CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/campaigns/new')}>
            <Plus className="mr-1.5 size-4" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* Filters — mobile compact (Search + Status + Plus). Desktop : tout visible. */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom ou client..."
            className="h-10 pl-9 text-sm sm:h-9 sm:min-w-[240px]"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              <option value="all">Tous statuts ({campaigns?.length ?? 0})</option>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CAMPAIGN_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <div className="relative hidden sm:flex">
            <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
            >
              <option value="all">Tous clients</option>
              {uniqueClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="relative hidden sm:flex">
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
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="relative inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 text-sm hover:bg-muted sm:hidden"
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal className="size-4" />
            {clientFilter !== 'all' && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                1
              </span>
            )}
          </button>
        </div>

        {/* Filtres avances mobile */}
        {mobileFiltersOpen && (
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <div className="relative col-span-2">
              <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
              >
                <option value="all">Tous clients</option>
                {uniqueClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="relative col-span-2">
              <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
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
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Impossible de charger les campagnes" />
      ) : !filtered.length ? (
        hasActiveFilters ? (
          <EmptyState
            icon={Megaphone}
            title="Aucune campagne trouvée"
            description="Aucun résultat pour ces critères. Modifie les filtres ou réinitialise la recherche."
            action={{ label: 'Réinitialiser les filtres', onClick: resetFilters, variant: 'outline' }}
            size="compact"
          />
        ) : (
          <EmptyState
            icon={Megaphone}
            title="Aucune campagne pour le moment"
            description="Crée ta première campagne pour assigner des panneaux et générer des rapports."
            action={{ label: 'Nouvelle campagne', onClick: () => navigate('/admin/campaigns/new'), icon: Plus }}
          />
        )
      ) : (
        <>
          {/* Mobile : cards stack */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((campaign) => {
              const status = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus]
              const clientName = campaign.clients?.company_name ?? ''
              const panelCount = panelCounts.get(campaign.id) ?? 0
              const target = campaign.target_panel_count
              const overdue = isOverdue(campaign)
              const progress = target && target > 0 ? Math.min(100, Math.round((panelCount / target) * 100)) : null
              return (
                <button
                  key={campaign.id}
                  onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                  className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate font-medium text-primary">{campaign.name}</span>
                      {overdue && (
                        <AlertTriangle className="size-3.5 shrink-0 text-red-500" aria-label="Date de fin dépassée" />
                      )}
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {clientName && (
                    <p className="truncate text-xs text-muted-foreground">{clientName}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className={overdue ? 'font-medium text-red-500' : ''}>
                      {new Date(campaign.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      {' → '}
                      {campaign.end_date
                        ? new Date(campaign.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : 'en cours'}
                    </span>
                    {target ? (
                      <span className="tabular-nums"><span className="font-medium text-foreground">{panelCount}</span> / {target}</span>
                    ) : panelCount > 0 ? (
                      <span className="tabular-nums">{panelCount} panneaux</span>
                    ) : null}
                  </div>
                  {target && progress !== null && (
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Desktop : table */}
          <Card className="hidden py-0 sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Client</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Période</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Panneaux</th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Budget</th>
                    <th className="w-10" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((campaign) => {
                    const status = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus]
                    const clientName = campaign.clients?.company_name ?? ''
                    const panelCount = panelCounts.get(campaign.id) ?? 0
                    const target = campaign.target_panel_count
                    const overdue = isOverdue(campaign)
                    const progress = target && target > 0 ? Math.min(100, Math.round((panelCount / target) * 100)) : null
                    return (
                      <tr
                        key={campaign.id}
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/campaigns/${campaign.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-primary hover:underline"
                            >
                              {campaign.name}
                            </Link>
                            {overdue && (
                              <span title="Date de fin dépassée">
                                <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground sm:hidden">{clientName}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {clientName || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-xs md:table-cell">
                          <span className={overdue ? 'font-medium text-red-500' : 'text-muted-foreground'}>
                            {new Date(campaign.start_date).toLocaleDateString('fr-FR')} → {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('fr-FR') : 'en cours'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {target ? (
                            <div className="flex w-32 flex-col gap-1">
                              <div className="flex justify-between text-xs tabular-nums">
                                <span className="font-medium">{panelCount}</span>
                                <span className="text-muted-foreground">/ {target}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    (progress ?? 0) >= 100 ? 'bg-green-500' : 'bg-primary'
                                  }`}
                                  style={{ width: `${progress ?? 0}%` }}
                                />
                              </div>
                            </div>
                          ) : panelCount > 0 ? (
                            <span className="text-muted-foreground">{panelCount}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">
                          {campaign.budget
                            ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.budget)
                            : '—'}
                        </td>
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)}
                              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={`Actions pour ${campaign.name}`}
                            >
                              <MoreVertical className="size-4" />
                            </button>
                            {openMenuId === campaign.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-popover py-1 shadow-lg">
                                  <button
                                    onClick={() => handleDelete(campaign.id, campaign.name)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="size-3.5" />
                                    Supprimer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  )
}
