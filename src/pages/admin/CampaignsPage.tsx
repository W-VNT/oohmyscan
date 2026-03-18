import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCampaigns, useCreateCampaign } from '@/hooks/useCampaigns'
import type { CampaignWithClient } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus, Megaphone, Search, Filter, ArrowUpDown, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
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

interface CampaignForm {
  name: string
  client_id: string
  description: string
  start_date: string
  end_date: string
  budget: string
  target_panel_count: string
  notes: string
}

interface StagedVisual {
  file: File
  formatId: string
  preview: string
}

const emptyForm: CampaignForm = {
  name: '',
  client_id: '',
  description: '',
  start_date: '',
  end_date: '',
  budget: '',
  target_panel_count: '',
  notes: '',
}

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
  const { data: panelTypes } = usePanelTypes()
  const createCampaign = useCreateCampaign()
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<CampaignForm>(emptyForm)
  const [stagedVisuals, setStagedVisuals] = useState<StagedVisual[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function openCreate() {
    setForm(emptyForm)
    setStagedVisuals([])
    setError(null)
    setSheetOpen(true)
  }

  function handleAddVisuals(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const newVisuals: StagedVisual[] = Array.from(files).map((file) => ({
      file,
      formatId: '',
      preview: URL.createObjectURL(file),
    }))
    setStagedVisuals((prev) => [...prev, ...newVisuals])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeVisual(index: number) {
    setStagedVisuals((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateVisualFormat(index: number, formatId: string) {
    setStagedVisuals((prev) =>
      prev.map((v, i) => (i === index ? { ...v, formatId } : v)),
    )
  }

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      stagedVisuals.forEach((v) => URL.revokeObjectURL(v.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    setError(null)

    if (!form.name.trim()) {
      setError('Le nom est requis')
      return
    }
    if (!form.client_id) {
      setError('Le client est requis')
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('Les dates de début et fin sont requises')
      return
    }
    if (form.end_date < form.start_date) {
      setError('La date de fin doit être après la date de début')
      return
    }

    setSaving(true)
    try {
      // 1. Create campaign
      const campaign = await createCampaign.mutateAsync({
        name: form.name,
        client_id: form.client_id || null,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date,
        budget: form.budget ? parseFloat(form.budget) : null,
        target_panel_count: form.target_panel_count ? parseInt(form.target_panel_count, 10) : null,
        notes: form.notes || null,
        status: 'draft',
        created_by: session?.user?.id,
      })

      // 2. Upload staged visuals
      if (stagedVisuals.length > 0) {
        for (let i = 0; i < stagedVisuals.length; i++) {
          const visual = stagedVisuals[i]
          const ext = visual.file.name.split('.').pop()
          const path = `${campaign.id}/${crypto.randomUUID()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('campaign-visuals')
            .upload(path, visual.file)
          if (uploadError) throw uploadError

          const { error: insertError } = await supabase
            .from('campaign_visuals')
            .insert({
              campaign_id: campaign.id,
              storage_path: path,
              file_name: visual.file.name,
              panel_format_id: visual.formatId || null,
              sort_order: i + 1,
            })
          if (insertError) throw insertError
        }
        queryClient.invalidateQueries({ queryKey: ['campaign-visuals', campaign.id] })
      }

      toast(`Campagne créée${stagedVisuals.length ? ` avec ${stagedVisuals.length} visuel${stagedVisuals.length > 1 ? 's' : ''}` : ''}`)
      setSheetOpen(false)
      // Cleanup previews
      stagedVisuals.forEach((v) => URL.revokeObjectURL(v.preview))
      setStagedVisuals([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création')
    } finally {
      setSaving(false)
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
        <Button onClick={openCreate}>
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
            className="h-9 pl-10 text-sm"
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
          action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouvelle campagne', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign) => {
            const status = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus]
            const clientName = campaign.clients?.company_name ?? ''
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

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nouvelle campagne</SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex-1 space-y-6">
            {/* Basic info */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Campagne été 2026"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Client *</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients?.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Période</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Début *</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fin *</label>
                  <Input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Budget & target */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objectifs</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Budget (€)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Panneaux cible</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.target_panel_count}
                    onChange={(e) => setForm((f) => ({ ...f, target_panel_count: e.target.value }))}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Description & notes */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description de la campagne..."
                  rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes..."
                  rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Visuels */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visuels ({stagedVisuals.length})
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Upload className="size-3" />
                  Ajouter
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddVisuals}
                />
              </div>

              {stagedVisuals.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ImageIcon className="size-8" />
                  <p className="text-xs">Cliquer pour ajouter des visuels</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stagedVisuals.map((visual, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-border p-2"
                    >
                      <img
                        src={visual.preview}
                        alt={visual.file.name}
                        className="size-14 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-xs font-medium">{visual.file.name}</p>
                        <select
                          value={visual.formatId}
                          onChange={(e) => updateVisualFormat(idx, e.target.value)}
                          className="h-7 w-full rounded border border-input bg-background px-2 text-[11px]"
                        >
                          <option value="">Tous types</option>
                          {panelTypes?.filter((t) => t.is_active).map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => removeVisual(idx)}
                        className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Créer la campagne
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
