import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePanel, useUpdatePanel } from '@/hooks/usePanels'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { PANEL_FORMATS, PANEL_TYPES } from '@/lib/constants'
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Pencil,
  X,
  Camera,
  Megaphone,
  Calendar,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  vacant: 'Vacant',
  maintenance: 'Maintenance',
  missing: 'Manquant',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  vacant: 'secondary',
  maintenance: 'outline',
  missing: 'destructive',
}

export function OperatorPanelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: panel, isLoading } = usePanel(id)
  const updatePanel = useUpdatePanel()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    format: '',
    type: '',
    notes: '',
  })

  // Photos for this panel
  const { data: photos } = useQuery({
    queryKey: ['panel-photos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*')
        .eq('panel_id', id!)
        .order('taken_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Active campaigns on this panel
  const { data: assignments } = useQuery({
    queryKey: ['panel-assignments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, campaigns(name, client, start_date, end_date)')
        .eq('panel_id', id!)
        .is('unassigned_at', null)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (panel) {
      setForm({
        name: panel.name ?? '',
        address: panel.address ?? '',
        city: panel.city ?? '',
        format: panel.format ?? '',
        type: panel.type ?? '',
        notes: panel.notes ?? '',
      })
    }
  }, [panel])

  async function handleSave() {
    if (!id) return
    try {
      await updatePanel.mutateAsync({
        id,
        name: form.name || null,
        address: form.address || null,
        city: form.city || null,
        format: form.format || null,
        type: form.type || null,
        notes: form.notes || null,
      })
      toast('Panneau mis à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!panel) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Panneau non trouvé</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary underline">
          Retour
        </button>
      </div>
    )
  }

  const PHOTO_TYPE_LABELS: Record<string, string> = {
    installation: 'Installation',
    check: 'Vérification',
    campaign: 'Campagne',
    damage: 'Dégât',
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-[15px] font-semibold">{panel.reference}</h1>
            {(panel.city || panel.address) && (
              <p className="text-[11px] text-muted-foreground">{panel.city || panel.address}</p>
            )}
          </div>
        </div>
        <Badge variant={STATUS_VARIANTS[panel.status] ?? 'secondary'} className="text-[11px]">
          {STATUS_LABELS[panel.status] ?? panel.status}
        </Badge>
      </div>

      <div className="space-y-4 p-4">
        {/* Info card */}
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Informations
              </p>
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {editing ? <X className="size-3" /> : <Pencil className="size-3" />}
                {editing ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Nom du commerce / lieu</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Boulangerie Dupont"
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Adresse</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Ex: 12 rue de Rivoli"
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Ville</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Ex: Paris"
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px]"
                  >
                    <option value="">—</option>
                    {PANEL_FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px]"
                  >
                    <option value="">—</option>
                    {PANEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Observations..."
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updatePanel.isPending}
                  className="w-full"
                  size="sm"
                >
                  {updatePanel.isPending ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : null}
                  Enregistrer
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <InfoRow label="Nom" value={panel.name} />
                <InfoRow label="Adresse" value={panel.address} />
                <InfoRow label="Ville" value={panel.city} />
                <InfoRow label="Format" value={panel.format} />
                <InfoRow label="Type" value={panel.type} />
                <InfoRow label="Notes" value={panel.notes} />
                <Separator />
                <InfoRow
                  label="GPS"
                  value={`${panel.lat.toFixed(6)}, ${panel.lng.toFixed(6)}`}
                  icon={<MapPin className="size-3 text-muted-foreground" />}
                />
                {panel.installed_at && (
                  <InfoRow
                    label="Installé le"
                    value={new Date(panel.installed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    icon={<Calendar className="size-3 text-muted-foreground" />}
                  />
                )}
                {panel.last_checked_at && (
                  <InfoRow
                    label="Dernier contrôle"
                    value={new Date(panel.last_checked_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active campaigns */}
        {assignments && assignments.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Campagnes actives
              </p>
              <div className="mt-3 space-y-2">
                {assignments.map((a) => {
                  const campaign = (a as Record<string, unknown>).campaigns as {
                    name: string
                    client: string
                    start_date: string
                    end_date: string
                  } | null
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 rounded-md border border-border p-2.5"
                    >
                      <Megaphone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{campaign?.name ?? '—'}</p>
                        <p className="text-[11px] text-muted-foreground">{campaign?.client}</p>
                        {campaign?.start_date && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                            {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {photos && photos.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Photos ({photos.length})
              </p>
              <div className="mt-3 space-y-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 rounded-md border border-border p-2.5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                      <Camera className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">
                        {PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}
                      </p>
                      {photo.taken_at && (
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(photo.taken_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 text-right">
        {icon}
        <span className="text-[13px] font-medium">{value || '—'}</span>
      </div>
    </div>
  )
}
