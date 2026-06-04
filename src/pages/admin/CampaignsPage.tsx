import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Megaphone, Search, Filter, ArrowUpDown, Download, X, AlertTriangle, Building2 } from 'lucide-react'
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
  const { data: campaigns, isLoading } = useCampaigns()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
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
        case 'end_date': return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
        default: return 0
      }
    })

    return result
  }, [campaigns, statusFilter, clientFilter, debouncedSearch, sort])

  function isOverdue(c: { end_date: string; status: string }): boolean {
    if (c.status === 'completed' || c.status === 'archived' || c.status === 'cancelled') return false
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
      new Date(c.end_date).toLocaleDateString('fr-FR'),
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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Campagnes</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{hasActiveFilters ? ` / ${campaigns?.length ?? 0}` : ''} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''}
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom ou client..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous statuts ({campaigns?.length ?? 0})</option>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CAMPAIGN_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
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
        <div className="relative">
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
      ) : !filtered.length ? (
        <EmptyState
          icon={Megaphone}
          title={debouncedSearch || statusFilter !== 'all' ? 'Aucune campagne trouvée' : 'Aucune campagne'}
          action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouvelle campagne', onClick: () => navigate('/admin/campaigns/new') } : undefined}
        />
      ) : (
        <Card>
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
                            {new Date(campaign.start_date).toLocaleDateString('fr-FR')} → {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
