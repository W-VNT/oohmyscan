import { useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCampaign, useCreateCampaign, useDeleteCampaign } from '@/hooks/useCampaigns'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { useClients } from '@/hooks/admin/useClients'
import { useUsers } from '@/hooks/admin/useUsers'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useCampaignDeposits } from '@/hooks/admin/useCampaignDeposits'
import { useCampaignFreePanels } from '@/hooks/admin/useCampaignFreePanels'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from '@/components/shared/Toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  PanelTop,
  Upload,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Pencil,
  Copy,
  Search,
  Sparkles,
  Megaphone,
  CheckCircle2,
  Flag,
  Package,
  MapPin,
  User as UserIcon,
} from 'lucide-react'
import { GenerateReportModal } from '@/components/admin/reports/GenerateReportModal'
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
        .select('*, panel_formats(name, has_qr_code, workflow_type)')
        .eq('campaign_id', campaignId!)
        .order('sort_order')
      if (error) throw error
      return data as (typeof data[number] & { panel_formats: { name: string; has_qr_code: boolean; workflow_type: 'qr' | 'deposit' | 'free_panel' } | null })[]
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
  const { data: allUsers } = useUsers()
  // Admins peuvent aussi etre assignes en operateur (ils font parfois du terrain).
  // On inclut aussi les invites (is_active peut etre false tant qu'ils n'ont
  // pas termine le set_password), sinon ils manquent dans le picker.
  const operators = allUsers?.filter(
    (u) => (u.role === 'operator' || u.role === 'admin') && (u.is_active || u.status === 'invited'),
  ) ?? []
  const assignedOperatorIds = ((campaign as Record<string, unknown> | undefined)?.operator_user_ids as string[]) ?? []
  const assignedOperators = operators.filter((u) => assignedOperatorIds.includes(u.id))
  const createCampaign = useCreateCampaign()
  const deleteCampaign = useDeleteCampaign()
  const confirm = useConfirm()
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
    operator_user_ids: [] as string[],
    panel_format_id: '',
  })

  // Cloning state
  const [cloning, setCloning] = useState(false)

  // Panel assignments pagination & search
  const [panelsExpanded, setPanelsExpanded] = useState(false)
  const [panelSearch, setPanelSearch] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Campaign deposits (sous-bocks, sets de table)
  const { data: deposits } = useCampaignDeposits(id)
  // Campaign free panels (pose unitaire sans QR liee a un lieu)
  const { data: freePanels } = useCampaignFreePanels(id)

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
      operator_user_ids: (campaign as Record<string, unknown>).operator_user_ids as string[] ?? [],
      panel_format_id: (campaign as Record<string, unknown>).panel_format_id as string ?? '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!campaign || !id) return

    if (!editForm.name.trim()) {
      toast('Le nom de la campagne est obligatoire', 'error')
      return
    }
    if (!editForm.start_date) {
      toast('La date de début est obligatoire', 'error')
      return
    }
    if (editForm.end_date && editForm.end_date < editForm.start_date) {
      toast('La date de fin doit être après la date de début', 'error')
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
          end_date: editForm.end_date || null,
          budget: editForm.budget ? Number(editForm.budget) : null,
          target_panel_count: editForm.target_panel_count ? Number(editForm.target_panel_count) : null,
          description: editForm.description.trim() || null,
          notes: editForm.notes.trim() || null,
          status: (editForm.status || campaign.status) as CampaignStatus,
          operator_user_ids: editForm.operator_user_ids,
          panel_format_id: editForm.panel_format_id || null,
        })
        .eq('id', id)
      if (error) throw error

      // Invalide toutes les vues qui listent les campagnes, y compris celles
      // cote operateur qui filtrent par operator_user_ids : leur cache serait
      // stale sinon (ils ne verraient pas la campagne juste assignee).
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
      queryClient.invalidateQueries({ queryKey: ['my-active-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['my-active-campaigns-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['my-campaigns-list'] })
      queryClient.invalidateQueries({ queryKey: ['diffuse-campaigns'] })
      toast('Campagne mise à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!campaign) return
    const ok = await confirm({
      title: `Supprimer "${campaign.name}" ?`,
      description:
        'La campagne, ses visuels, ses assignations panneaux et ses dépôts seront supprimés définitivement. Les devis et factures liés seront conservés (mais dé-liés). Action irréversible.',
      confirmLabel: 'Supprimer définitivement',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteCampaign.mutateAsync(campaign.id)
      toast('Campagne supprimée')
      navigate('/admin/campaigns')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur lors de la suppression', 'error')
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
        end_date: campaign.end_date ?? null,
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
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
            <Megaphone className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Campagne introuvable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cette campagne n'existe pas, a été supprimée ou tu n'y as pas accès.
            </p>
          </div>
          <Link to="/admin/campaigns" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90">
            <ArrowLeft className="size-3.5" />
            Retour aux campagnes
          </Link>
        </div>
      </div>
    )
  }

  const clientName = campaign.clients?.company_name ?? ''

  // Workflow : priorite au format campagne top-level (nouveau flow), fallback
  // sur les visuels (backward compat pour campagnes anciennes sans campaign.panel_format_id).
  const campaignWorkflow = campaign.campaign_format?.workflow_type
    ?? (visuals?.length ? visuals[0].panel_formats?.workflow_type : undefined)
  const isDepositCampaign = campaignWorkflow === 'deposit'
  const isFreePanelCampaign = campaignWorkflow === 'free_panel'

  // Compteur "panneaux poses" = SOMME de toutes les sources, quel que soit le
  // workflow actuel. Un admin qui switch le format d'une campagne existante
  // garde ainsi l'historique visible (panneaux QR deja poses + depots +
  // panneaux libres tous cumules). Chaque source = 1 pose sur le terrain.
  const assignedCount = (assignments?.length ?? 0)
    + (deposits?.length ?? 0)
    + (freePanels?.length ?? 0)
  const target = campaign.target_panel_count
  const progressPct = target && target > 0 ? Math.min((assignedCount / target) * 100, 100) : null

  return (
    <div className="space-y-8">
      {/* Header — stack en mobile, ligne unique desktop */}
      <div className="flex flex-wrap items-start gap-3">
        <Link
          to="/admin/campaigns"
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold sm:text-xl">{campaign.name}</h1>
          {clientName && <p className="mt-1 truncate text-sm text-muted-foreground">{clientName}</p>}
        </div>
        {!editing && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {campaign.status === 'active' && (
              <Button size="sm" onClick={() => updateStatus.mutate('completed')} disabled={updateStatus.isPending} className="flex-1 sm:flex-none">
                <Flag className="mr-1.5 size-3.5" />
                Marquer terminée
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClone} disabled={cloning} className="flex-1 sm:flex-none">
              {cloning ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Copy className="mr-1.5 size-3.5" />}
              Dupliquer
            </Button>
            <Button variant="outline" size="sm" onClick={openEdit} className="flex-1 sm:flex-none">
              <Pencil className="mr-1.5 size-3.5" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteCampaign.isPending}
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive sm:flex-none"
            >
              {deleteCampaign.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Trash2 className="mr-1.5 size-3.5" />}
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Auto-suggestion : cible atteinte */}
      {campaign.status === 'active' && target && assignedCount >= target && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Objectif atteint — {assignedCount}/{target} panneaux posés
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tu peux marquer cette campagne comme terminée pour libérer les panneaux et générer le rapport.
              </p>
            </div>
            <Button size="sm" onClick={() => updateStatus.mutate('completed')} disabled={updateStatus.isPending} className="shrink-0">
              <Flag className="mr-1.5 size-3.5" />
              Terminer
            </Button>
          </div>
        </div>
      )}

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
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
                      className="h-10 rounded-lg text-sm sm:h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Client</label>
                    <select
                      value={editForm.client_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, client_id: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm sm:h-9"
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
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm sm:h-9"
                    >
                      {CAMPAIGN_STATUSES.map((s) => (
                        <option key={s} value={s}>{CAMPAIGN_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 1b : Format de support (determine le workflow terrain) */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Format de support
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Change le workflow opérateur (QR / dépôt / panneau libre)
                    </span>
                  </label>
                  <select
                    value={editForm.panel_format_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, panel_format_id: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm sm:h-9"
                  >
                    <option value="">Aucun format défini</option>
                    {panelTypes?.filter((t) => t.is_active).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.workflow_type === 'deposit' ? ' — Dépôt (sans QR)' : ''}
                        {t.workflow_type === 'free_panel' ? ' — Panneau libre (sans QR)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 2: Date début | Date fin | Budget | Panneaux cible */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date début</label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="h-10 rounded-lg text-sm sm:h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Date fin <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                    </label>
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="h-10 rounded-lg text-sm sm:h-9"
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
                      className="h-10 rounded-lg text-sm sm:h-9"
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
                      className="h-10 rounded-lg text-sm sm:h-9"
                    />
                  </div>
                </div>

                {/* Row 3a: Opérateurs assignés */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Opérateurs assignés
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (visible dans leur app)
                    </span>
                  </label>
                  {operators.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun opérateur actif.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {operators.map((op) => {
                        const checked = editForm.operator_user_ids.includes(op.id)
                        return (
                          <label
                            key={op.id}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              checked
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-foreground/30'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  operator_user_ids: e.target.checked
                                    ? [...f.operator_user_ids, op.id]
                                    : f.operator_user_ids.filter((id) => id !== op.id),
                                }))
                              }
                              className="size-4 rounded border-border"
                            />
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {op.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-medium">{op.full_name}</span>
                            {op.role === 'admin' && (
                              <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
                                admin
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Row 3b: Description (full width) */}
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
                  <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
                    {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 sm:flex-none">
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
                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('fr-FR') : 'en cours'}
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
                {/* Row 2b: Opérateurs assignés */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">Opérateurs assignés</p>
                  {assignedOperators.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground italic">Aucun (les opérateurs verront la campagne seulement après avoir posé un panneau)</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {assignedOperators.map((op) => (
                        <span key={op.id} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                            {op.full_name.charAt(0).toUpperCase()}
                          </span>
                          {op.full_name}
                        </span>
                      ))}
                    </div>
                  )}
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

          {/* Dépôts (campagnes sous-bocks / sets de table) */}
          {isDepositCampaign && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold">
                  Dépôts ({deposits?.length ?? 0})
                </h3>
              </div>

              {/* KPI */}
              {deposits && deposits.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Total déposé</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {deposits.reduce((sum, d) => sum + d.quantity, 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Lieux uniques</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {new Set(deposits.map((d) => d.place_id || d.place_name)).size}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Passages</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {deposits.length}
                    </p>
                  </div>
                </div>
              )}

              {!deposits?.length ? (
                <EmptyState
                  icon={Package}
                  title="Aucun dépôt enregistré"
                  description="Les dépôts apparaîtront ici dès que les opérateurs commenceront la diffusion sur le terrain."
                  size="inline"
                />
              ) : (
                <div className="mt-4 divide-y divide-border">
                  {deposits.map((d) => (
                    <div key={d.id} className="flex items-start gap-3 py-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <MapPin className="size-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.place_name}</p>
                        {d.place_address && (
                          <p className="truncate text-xs text-muted-foreground">{d.place_address}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="size-3" />
                            {d.operator?.full_name ?? '—'}
                          </span>
                          <span>{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-semibold tabular-nums">{d.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">unités</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panneaux libres (campagnes free_panel) */}
          {isFreePanelCampaign && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold">
                  Panneaux libres ({freePanels?.length ?? 0})
                </h3>
              </div>

              {freePanels && freePanels.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Total posé</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">{freePanels.length}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Lieux uniques</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {new Set(freePanels.map((p) => p.location_id)).size}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Opérateurs</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {new Set(freePanels.map((p) => p.operator_id)).size}
                    </p>
                  </div>
                </div>
              )}

              {!freePanels?.length ? (
                <EmptyState
                  icon={MapPin}
                  title="Aucun panneau libre posé"
                  description="Les poses apparaîtront ici dès que les opérateurs commenceront la diffusion sur le terrain."
                  size="inline"
                />
              ) : (
                <div className="mt-4 divide-y divide-border">
                  {freePanels.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 py-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                        <MapPin className="size-4 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.location?.name ?? '—'}</p>
                        {p.location?.city && (
                          <p className="truncate text-xs text-muted-foreground">
                            {p.location.city}{p.location.postal_code ? ` · ${p.location.postal_code}` : ''}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="size-3" />
                            {p.operator?.full_name ?? '—'}
                          </span>
                          <span>{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      {p.location?.id && (
                        <Link
                          to={`/admin/locations/${p.location.id}`}
                          className="shrink-0 text-xs text-primary underline"
                        >
                          Fiche lieu
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assigned panels (campagnes QR) */}
          {!isDepositCampaign && !isFreePanelCampaign && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
              <EmptyState
                icon={PanelTop}
                title={panelSearch ? 'Aucun panneau ne correspond' : 'Aucun panneau assigné'}
                size="inline"
              />
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
          )}

          {/* Campaign visuals */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
              <EmptyState icon={ImageIcon} title="Aucun visuel uploadé" size="inline" />
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
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Sparkles className="size-4" />
                  Generer rapport campagne
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {id && (
        <GenerateReportModal
          campaignId={id}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  )
}
