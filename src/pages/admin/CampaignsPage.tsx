import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCampaigns, useCreateCampaign } from '@/hooks/useCampaigns'
import type { CampaignWithClient } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader2, Plus, X, Megaphone, Search, Filter, ArrowUpDown } from 'lucide-react'
import { toast } from '@/components/shared/Toast'
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_CONFIG, type CampaignStatus } from '@/lib/constants'

type SortOption = 'newest' | 'oldest' | 'name' | 'start_date' | 'end_date'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'name', label: 'Nom A-Z' },
  { value: 'start_date', label: 'Date début' },
  { value: 'end_date', label: 'Date fin' },
]

function getTimeIndicator(campaign: CampaignWithClient): string | null {
  const now = new Date()
  const start = new Date(campaign.start_date)
  const end = new Date(campaign.end_date)
  const msDay = 86400000

  if (campaign.status === 'draft') {
    const daysToStart = Math.ceil((start.getTime() - now.getTime()) / msDay)
    if (daysToStart > 0) return `Début dans ${daysToStart}j`
    return null
  }

  if (campaign.status === 'active') {
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / msDay)
    if (daysLeft <= 0) return 'Dépasse la date fin'
    if (daysLeft <= 7) return `J-${daysLeft}`
    return 'En cours'
  }

  if (campaign.status === 'completed') {
    const daysSince = Math.floor((now.getTime() - end.getTime()) / msDay)
    if (daysSince <= 0) return 'Terminée aujourd\'hui'
    return `Terminée depuis ${daysSince}j`
  }

  return null
}

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: clients } = useClients()
  const createCampaign = useCreateCampaign()
  const { session } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    client_id: '',
    description: '',
    start_date: '',
    end_date: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

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

  // Debounce search
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

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of campaigns ?? []) {
      counts[c.status] = (counts[c.status] || 0) + 1
    }
    return counts
  }, [campaigns])

  // Filter + search + sort
  const filtered = useMemo(() => {
    if (!campaigns) return []
    let result = campaigns

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter((c) => {
        const clientName = c.clients?.company_name ?? c.client
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setError('La date de fin doit être après la date de début')
      return
    }

    const selectedClient = clients?.find((c) => c.id === form.client_id)

    try {
      await createCampaign.mutateAsync({
        name: form.name,
        client: selectedClient?.company_name ?? '',
        client_id: form.client_id || null,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: 'draft',
        created_by: session?.user?.id,
      })
      toast('Campagne créée')
      setShowForm(false)
      setForm({ name: '', client_id: '', description: '', start_date: '', end_date: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Campagnes</h2>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{statusFilter !== 'all' || debouncedSearch ? ` / ${campaigns?.length ?? 0}` : ''} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Annuler' : 'Nouvelle campagne'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Campagne été 2026"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client *</label>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un client</option>
                {clients?.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date début *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date fin *</label>
              <input
                type="date"
                required
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description de la campagne..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={createCampaign.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer la campagne
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom ou client..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
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
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
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
          action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouvelle campagne', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign) => {
            const status = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus]
            const clientName = campaign.clients?.company_name ?? campaign.client
            const timeIndicator = getTimeIndicator(campaign)
            const panelCount = panelCounts.get(campaign.id) ?? 0
            return (
              <Link
                key={campaign.id}
                to={`/admin/campaigns/${campaign.id}`}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                  </span>
                  {panelCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {panelCount} panneau{panelCount !== 1 ? 'x' : ''}
                    </span>
                  )}
                </div>
                {timeIndicator && (
                  <p className={`mt-2 text-xs font-medium ${
                    campaign.status === 'active' && timeIndicator.startsWith('J-')
                      ? 'text-orange-500'
                      : campaign.status === 'active'
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                  }`}>
                    {timeIndicator}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
