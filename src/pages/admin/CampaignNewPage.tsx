import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { usePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
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
  const createCampaign = useCreateCampaign()
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const [form, setForm] = useState<CampaignForm>(emptyForm)
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
              <label className="mb-2 block text-sm font-medium">Nom *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Campagne été 2026"
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Client *</label>
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

          {/* Row 2: Date début | Date fin | Budget | Panneaux cible */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Date début *</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Date fin *</label>
              <Input
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
