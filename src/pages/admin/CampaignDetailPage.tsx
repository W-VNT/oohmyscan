import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from '@/components/shared/Toast'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PanelTop, FileText, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import { CAMPAIGN_STATUS_CONFIG, type PanelStatus, type CampaignStatus } from '@/lib/constants'

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

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: campaign, isLoading } = useCampaign(id)
  const { data: panelTypes } = usePanelTypes()
  const { data: visuals } = useCampaignVisuals(id)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFormatId, setUploadFormatId] = useState<string>('')
  const [uploading, setUploading] = useState(false)

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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/campaigns"
            className="rounded-md p-1 transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{campaign.name}</h2>
            <p className="mt-1 text-muted-foreground">{clientName}</p>
          </div>
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="mt-1 text-sm font-medium">
                  {CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus].label}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Période</p>
                <p className="mt-1 text-sm">
                  {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {campaign.budget != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="mt-1 text-sm font-medium">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.budget)}
                  </p>
                </div>
              )}
              {target != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Panneaux prévus</p>
                  <p className="mt-1 text-sm font-medium">{target}</p>
                </div>
              )}
            </div>
            {campaign.description && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 text-sm">{campaign.description}</p>
              </div>
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
            {!assignments?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aucun panneau assigné à cette campagne
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assignments.map((a) => {
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
