import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Megaphone, Search, Filter, ArrowUpDown } from 'lucide-react'
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

  const filtered = useMemo(() => {
    if (!campaigns) return []
    let result = campaigns

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
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
  }, [campaigns, statusFilter, debouncedSearch, sort])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Campagnes</h1>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{statusFilter !== 'all' || debouncedSearch ? ` / ${campaigns?.length ?? 0}` : ''} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/campaigns/new')}>
          <Plus className="mr-1.5 size-4" />
          Nouvelle campagne
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
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
            <option value="all">Tous les statuts ({campaigns?.length ?? 0})</option>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CAMPAIGN_STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
              </option>
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
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((campaign) => {
                    const status = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus]
                    const clientName = campaign.clients?.company_name ?? ''
                    const panelCount = panelCounts.get(campaign.id) ?? 0
                    const target = campaign.target_panel_count
                    return (
                      <tr
                        key={campaign.id}
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/campaigns/${campaign.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-primary hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          <p className="text-xs text-muted-foreground sm:hidden">{clientName}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {clientName || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                          {new Date(campaign.start_date).toLocaleDateString('fr-FR')} → {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {panelCount > 0
                            ? target
                              ? `${panelCount}/${target}`
                              : `${panelCount}`
                            : target
                              ? `0/${target}`
                              : '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
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
