import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useUsers } from '@/hooks/admin/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Upload, Trash2, Image as ImageIcon, Package, QrCode, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/shared/Toast'

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

export function CampaignNewPage() {
  const navigate = useNavigate()
  const { data: clients } = useClients()
  const { data: panelTypes } = usePanelTypes()
  const { data: allUsers } = useUsers()
  // Admins peuvent aussi etre assignes en operateur (ils font parfois du terrain).
  // On inclut aussi les invites (is_active peut etre false tant qu'ils n'ont
  // pas termine le set_password), sinon ils manquent dans le picker.
  const operators = allUsers?.filter(
    (u) => (u.role === 'operator' || u.role === 'admin') && (u.is_active || u.status === 'invited'),
  ) ?? []
  const createCampaign = useCreateCampaign()
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const [form, setForm] = useState<CampaignForm>(emptyForm)
  const [assignedOperators, setAssignedOperators] = useState<string[]>([])
  const [stagedVisuals, setStagedVisuals] = useState<StagedVisual[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Détecte le workflow de la campagne en fonction des formats des visuels
  const formatsByVisual = stagedVisuals.map((v) =>
    v.formatId ? panelTypes?.find((t) => t.id === v.formatId) : null,
  )
  const hasQrVisuals = formatsByVisual.some((f) => f?.has_qr_code === true)
  const hasNonQrVisuals = formatsByVisual.some((f) => f?.has_qr_code === false)
  const isDepositOnly = hasNonQrVisuals && !hasQrVisuals
  const isMixed = hasQrVisuals && hasNonQrVisuals

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
    if (!form.start_date) {
      setError('La date de début est requise')
      return
    }
    if (form.end_date && form.end_date < form.start_date) {
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
        end_date: form.end_date || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        target_panel_count: form.target_panel_count ? parseInt(form.target_panel_count, 10) : null,
        notes: form.notes || null,
        status: 'draft',
        created_by: session?.user?.id,
        operator_user_ids: assignedOperators,
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
      // Cleanup previews
      stagedVisuals.forEach((v) => URL.revokeObjectURL(v.preview))
      setStagedVisuals([])
      navigate(`/admin/campaigns/${campaign.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/campaigns"
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Nouvelle campagne</h1>
      </div>

      {/* Form card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Row 1: Nom | Client | Statut */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="campaign-name" className="mb-2 block text-sm font-medium">Nom <span className="text-red-500">*</span></label>
              <Input
                id="campaign-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Campagne été 2026"
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div>
              <label htmlFor="campaign-client" className="mb-2 block text-sm font-medium">Client <span className="text-red-500">*</span></label>
              <select
                id="campaign-client"
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
            <div>
              <label className="mb-2 block text-sm font-medium">Statut</label>
              <select
                disabled
                value="draft"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm opacity-60"
              >
                <option value="draft">Brouillon</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date début | Date fin | Budget | Panneaux cible (caché si dépôt) */}
          <div className={`grid gap-4 ${isDepositOnly ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            <div>
              <label htmlFor="campaign-start" className="mb-2 block text-sm font-medium">Date début <span className="text-red-500">*</span></label>
              <Input
                id="campaign-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div>
              <label htmlFor="campaign-end" className="mb-2 block text-sm font-medium">
                Date fin
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <Input
                id="campaign-end"
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Budget (€)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="0.00"
                className="h-9 rounded-lg text-sm"
              />
            </div>
            {!isDepositOnly && (
              <div>
                <label className="mb-2 block text-sm font-medium">Panneaux cible</label>
                <Input
                  type="number"
                  min="0"
                  value={form.target_panel_count}
                  onChange={(e) => setForm((f) => ({ ...f, target_panel_count: e.target.value }))}
                  placeholder="0"
                  className="h-9 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description de la campagne..."
              rows={2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* Row 3b: Opérateurs assignés */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Opérateurs assignés
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (visible dans leur app dès la création)
              </span>
            </label>
            {operators.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun opérateur actif. Invite-en un depuis Utilisateurs.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {operators.map((op) => {
                  const checked = assignedOperators.includes(op.id)
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
                          setAssignedOperators((prev) =>
                            e.target.checked ? [...prev, op.id] : prev.filter((id) => id !== op.id),
                          )
                        }
                        className="size-4 rounded border-border"
                      />
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {op.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium">{op.full_name}</span>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {op.role === 'admin' && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
                            admin
                          </span>
                        )}
                        {op.status === 'invited' && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                            invité
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Row 4: Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium">Notes internes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes..."
              rows={2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visuals card */}
      <Card>
        <CardContent className="p-6">
          {/* Bandeau workflow auto-détecté */}
          {stagedVisuals.length > 0 && (hasQrVisuals || hasNonQrVisuals) && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              isMixed
                ? 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400'
                : isDepositOnly
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                  : 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400'
            }`}>
              {isMixed ? (
                <>
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <p className="font-medium">Visuels mélangés (QR + dépôt)</p>
                    <p className="mt-0.5 opacity-80">Une campagne doit utiliser un seul type de workflow. Choisis soit des formats avec QR (panneaux), soit sans QR (sous-bocks, sets de table…).</p>
                  </div>
                </>
              ) : isDepositOnly ? (
                <>
                  <Package className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <p className="font-medium">Workflow dépôt</p>
                    <p className="mt-0.5 opacity-80">Pas de QR à scanner. L'opérateur indique le lieu, la quantité déposée et prend une photo.</p>
                  </div>
                </>
              ) : (
                <>
                  <QrCode className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <p className="font-medium">Workflow QR</p>
                    <p className="mt-0.5 opacity-80">L'opérateur scanne le QR du panneau pour valider la pose.</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">
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
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex gap-3">
        <Button onClick={handleCreate} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          Créer la campagne
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/campaigns')}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
