import { useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCampaign, useCreateCampaign } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from '@/components/shared/Toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  PanelTop,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Pencil,
  Copy,
  Search,
} from 'lucide-react'
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_CONFIG,
  type PanelStatus,
  type CampaignStatus,
} from '@/lib/constants'

// Hook for campaign visuals
function useCampaignVisuals(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-visuals', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_visuals')
        .select('*, panel_formats(name)')
        .eq('campaign_id', campaignId!)
        .order('sort_order')
      if (error) throw error
      return data as (typeof data[number] & { panel_formats: { name: string } | null })[]
    },
    enabled: !!campaignId,
  })
}

const PANELS_PAGE_SIZE = 10

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: campaign, isLoading } = useCampaign(id)
  const { data: panelTypes } = usePanelTypes()
  const { data: visuals } = useCampaignVisuals(id)
  const { data: clients } = useClients()
  const createCampaign = useCreateCampaign()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFormatId, setUploadFormatId] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  // Inline editing state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    budget: '',
    target_panel_count: '',
    description: '',
    notes: '',
    status: '' as CampaignStatus | '',
  })

  // Cloning state
  const [cloning, setCloning] = useState(false)

  // Panel assignments pagination & search
  const [panelsExpanded, setPanelsExpanded] = useState(false)
  const [panelSearch, setPanelSearch] = useState('')

  const { data: assignments } = useQuery({
    queryKey: ['campaign-panels', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(id, reference, name, status)')
        .eq('campaign_id', id!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Filtered + paginated assignments
  const filteredAssignments = useMemo(() => {
    if (!assignments) return []
    if (!panelSearch.trim()) return assignments
    const q = panelSearch.toLowerCase()
    return assignments.filter((a) => {
      const panel = (a as Record<string, unknown>).panels as {
        id: string
        reference: string
        name: string | null
        status: string
      } | null
      if (!panel) return false
      return (
        panel.reference.toLowerCase().includes(q) ||
        (panel.name && panel.name.toLowerCase().includes(q))
      )
    })
  }, [assignments, panelSearch])

  const visibleAssignments = panelsExpanded
    ? filteredAssignments
    : filteredAssignments.slice(0, PANELS_PAGE_SIZE)

  const updateStatus = useMutation({
    mutationFn: async (status: CampaignStatus) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })

  const deleteVisual = useMutation({
    mutationFn: async (visualId: string) => {
      const visual = visuals?.find((v) => v.id === visualId)
      if (visual) {
        await supabase.storage.from('campaign-visuals').remove([visual.storage_path])
      }
      const { error } = await supabase.from('campaign_visuals').delete().eq('id', visualId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-visuals', id] })
    },
  })

  // --- Inline editing ---
  function openEdit() {
    if (!campaign) return
    setEditForm({
      name: campaign.name || '',
      client_id: campaign.client_id ?? '',
      start_date: campaign.start_date ?? '',
      end_date: campaign.end_date ?? '',
      budget: campaign.budget != null ? String(campaign.budget) : '',
      target_panel_count: campaign.target_panel_count != null ? String(campaign.target_panel_count) : '',
      description: campaign.description ?? '',
      notes: campaign.notes ?? '',
      status: campaign.status as CampaignStatus,
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!campaign || !id) return

    if (!editForm.name.trim()) {
      toast('Le nom de la campagne est obligatoire', 'error')
      return
    }
    if (!editForm.start_date || !editForm.end_date) {
      toast('Les dates de début et fin sont obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: editForm.name.trim(),
          client_id: editForm.client_id || null,
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          budget: editForm.budget ? Number(editForm.budget) : null,
          target_panel_count: editForm.target_panel_count ? Number(editForm.target_panel_count) : null,
          description: editForm.description.trim() || null,
          notes: editForm.notes.trim() || null,
          status: (editForm.status || campaign.status) as CampaignStatus,
        })
        .eq('id', id)
      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
      toast('Campagne mise à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // --- Cloning ---
  async function handleClone() {
    if (!campaign) return
    setCloning(true)
    try {
      const newCampaign = await createCampaign.mutateAsync({
        name: `${campaign.name} (copie)`,
        client_id: campaign.client_id ?? null,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        budget: campaign.budget ?? null,
        target_panel_count: campaign.target_panel_count ?? null,
        description: campaign.description ?? null,
        notes: campaign.notes ?? null,
        status: 'draft',
      })
      toast('Campagne dupliquée')
      navigate(`/admin/campaigns/${newCampaign.id}`)
    } catch {
      toast('Erreur lors de la duplication', 'error')
    } finally {
      setCloning(false)
    }
  }

  async function handleUploadVisual(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('campaign-visuals')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('campaign_visuals').insert({
        campaign_id: id,
        storage_path: path,
        file_name: file.name,
        panel_format_id: uploadFormatId || null,
        sort_order: (visuals?.length ?? 0) + 1,
      })
      if (insertError) throw insertError

      queryClient.invalidateQueries({ queryKey: ['campaign-visuals', id] })
      toast('Visuel uploadé')
    } catch {
      toast('Erreur lors de l\'upload', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function getVisualUrl(storagePath: string) {
    const { data } = supabase.storage.from('campaign-visuals').getPublicUrl(storagePath)
    return data.publicUrl
  }

  if (isLoading) return <LoadingScreen />

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Campagne non trouvée</p>
        <Link to="/admin/campaigns" className="mt-4 text-sm text-primary underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  const clientName = campaign.clients?.company_name ?? ''
  const assignedCount = assignments?.length ?? 0
  const target = campaign.target_panel_count
  const progressPct = target && target > 0 ? Math.min((assignedCount / target) * 100, 100) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/campaigns"
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{campaign.name}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={handleClone} disabled={cloning}>
                {cloning ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Copy className="mr-1.5 size-3.5" />}
                Dupliquer
              </Button>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="mr-1.5 size-3.5" />
                Modifier
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progressPct !== null && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Progression : {assignedCount} / {target} panneaux
            </span>
            <span className="tabular-nums text-muted-foreground">{progressPct.toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Détails</h3>

            {editing ? (
              /* ---- EDIT MODE ---- */
              <div className="mt-4 space-y-4">
                {/* Row 1: Nom | Client | Statut */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Nom</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nom de la campagne"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Client</label>
                    <select
                      value={editForm.client_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, client_id: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Aucun client</option>
                      {clients?.filter((c) => c.is_active).map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Statut</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CampaignStatus }))}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {CAMPAIGN_STATUSES.map((s) => (
                        <option key={s} value={s}>{CAMPAIGN_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Date début | Date fin | Budget | Panneaux cible */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date début</label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date fin</label>
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Budget (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.budget}
                      onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))}
                      placeholder="0.00"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Panneaux cible</label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.target_panel_count}
                      onChange={(e) => setEditForm((f) => ({ ...f, target_panel_count: e.target.value }))}
                      placeholder="0"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Row 3: Description (full width) */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                    placeholder="Description de la campagne..."
                  />
                </div>

                {/* Row 4: Notes (full width) */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                    placeholder="Notes internes..."
                  />
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              /* ---- READ MODE ---- */
              <>
                {/* Row 1: Nom | Client | Statut */}
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nom</p>
                    <p className="mt-1 text-sm font-medium">{campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="mt-1 text-sm">{clientName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <p className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus].className}`}>
                        {CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus].label}
                      </span>
                    </p>
                  </div>
                </div>
                {/* Row 2: Période | Budget | Panneaux */}
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Période</p>
                    <p className="mt-1 text-sm">
                      {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                      {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="mt-1 text-sm font-medium">
                      {campaign.budget != null
                        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.budget)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Panneaux</p>
                    <p className="mt-1 text-sm font-medium">
                      {target != null ? `${assignedCount} / ${target}` : assignedCount > 0 ? `${assignedCount}` : '—'}
                    </p>
                  </div>
                </div>
                {/* Row 3: Description */}
                {campaign.description && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm">{campaign.description}</p>
                  </div>
                )}
                {/* Row 4: Notes */}
                {campaign.notes && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{campaign.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Assigned panels */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <PanelTop className="h-4 w-4" />
              <h3 className="font-semibold">
                Panneaux assignés ({assignedCount})
              </h3>
            </div>

            {/* Search input */}
            {assignments && assignments.length > 0 && (
              <div className="relative mt-4">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={panelSearch}
                  onChange={(e) => {
                    setPanelSearch(e.target.value)
                    setPanelsExpanded(false)
                  }}
                  placeholder="Rechercher par nom ou référence..."
                  className="pl-8 text-sm"
                />
              </div>
            )}

            {!filteredAssignments.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {panelSearch
                  ? 'Aucun panneau ne correspond à la recherche'
                  : 'Aucun panneau assigné à cette campagne'}
              </p>
            ) : (
              <>
                <div className="mt-4 divide-y divide-border">
                  {visibleAssignments.map((a) => {
                    const panel = (a as Record<string, unknown>).panels as {
                      id: string
                      reference: string
                      name: string | null
                      status: string
                    } | null
                    return (
                      <div key={a.id} className="flex items-center justify-between py-3">
                        <div>
                          <Link
                            to={`/admin/panels/${panel?.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {panel?.reference ?? '—'}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {panel?.name || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {panel && (
                            <StatusBadge status={panel.status as PanelStatus} />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.assigned_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Show all / collapse button */}
                {filteredAssignments.length > PANELS_PAGE_SIZE && (
                  <button
                    onClick={() => setPanelsExpanded((v) => !v)}
                    className="mt-3 w-full rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-accent"
                  >
                    {panelsExpanded
                      ? 'Réduire'
                      : `Voir tous les ${filteredAssignments.length} panneaux`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Campaign visuals */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <h3 className="font-semibold">Visuels ({visuals?.length ?? 0})</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={uploadFormatId}
                  onChange={(e) => setUploadFormatId(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  <option value="">Tous types</option>
                  {panelTypes?.filter((t) => t.is_active).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadVisual}
                />
              </div>
            </div>
            {!visuals?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aucun visuel uploadé
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visuals.map((v) => (
                  <div key={v.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img
                      src={getVisualUrl(v.storage_path)}
                      alt={v.file_name}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="truncate text-xs text-white">{v.file_name}</p>
                      {v.panel_formats && (
                        <p className="text-[10px] text-white/70">{v.panel_formats.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteVisual.mutate(v.id)}
                      className="absolute right-1.5 top-1.5 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">Actions</h3>
            <div className="space-y-2">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => updateStatus.mutate('active')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Activer la campagne
                </button>
              )}
              {campaign.status === 'active' && (
                <button
                  onClick={() => updateStatus.mutate('completed')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Marquer terminée
                </button>
              )}
              {(campaign.status === 'draft' || campaign.status === 'active') && (
                <button
                  onClick={() => updateStatus.mutate('cancelled')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-lg border border-input px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-accent disabled:opacity-50"
                >
                  Annuler la campagne
                </button>
              )}
              {(campaign.status === 'active' || campaign.status === 'completed') && (
                <Link
                  to={`/admin/reports/${id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <FileText className="size-4" />
                  Proof of Posting
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
