import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePanel, useUpdatePanel } from '@/hooks/usePanels'
import { useActivePanelTypes } from '@/hooks/admin/usePanelTypes'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { PANEL_STATUSES, PANEL_STATUS_CONFIG, PANEL_ZONES } from '@/lib/constants'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  Megaphone,
  FileText,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'
import type { PanelPhoto, PanelCampaign } from '@/types'

export function PanelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: panel, isLoading } = usePanel(id)
  const updatePanel = useUpdatePanel()
  const { data: panelTypes } = useActivePanelTypes()
  const { data: companySettings } = useCompanySettings()
  const defaultTypeName = useMemo(() => {
    if (!companySettings?.default_panel_type_id || !panelTypes) return ''
    return panelTypes.find((t) => t.id === companySettings.default_panel_type_id)?.name ?? ''
  }, [companySettings, panelTypes])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '', city: '', type: '', status: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const { data: photos } = useQuery({
    queryKey: ['panel-photos', id],
    queryFn: async (): Promise<PanelPhoto[]> => {
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

  const { data: assignments } = useQuery({
    queryKey: ['panel-campaigns', id],
    queryFn: async (): Promise<(PanelCampaign & { campaign_name?: string })[]> => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, campaigns(name, client_id, clients(company_name))')
        .eq('panel_id', id!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Check if panel has a contract via its location
  const { data: contract } = useQuery({
    queryKey: ['panel-contract', panel?.location_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_contracts')
        .select('id, contract_number, status, storage_path')
        .eq('location_id', panel!.location_id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!panel?.location_id,
  })

  function openEdit() {
    if (!panel) return
    setEditForm({
      name: panel.name || '',
      address: panel.address || '',
      city: panel.city || '',
      type: panel.type || defaultTypeName || '',
      status: panel.status,
      notes: panel.notes || '',
    })
    setEditOpen(true)
  }

  async function handleSavePanel() {
    if (!panel) return
    setSaving(true)
    try {
      await updatePanel.mutateAsync({
        id: panel.id,
        name: editForm.name || null,
        address: editForm.address || null,
        city: editForm.city || null,
        type: editForm.type || null,
        status: (editForm.status || panel.status) as PanelStatus,
        notes: editForm.notes || null,
      })
      toast('Panneau mis à jour')
      setEditOpen(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <LoadingScreen />

  if (!panel) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Panneau non trouvé</p>
        <Link to="/admin/panels" className="mt-4 text-sm text-primary underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  function getPhotoUrl(storagePath: string) {
    const { data } = supabase.storage.from('panel-photos').getPublicUrl(storagePath)
    return data.publicUrl
  }

  const displayName = panel.locations?.name || panel.name || panel.reference

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/panels"
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{displayName}</h2>
            <StatusBadge status={panel.status as PanelStatus} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {panel.city || panel.address || panel.reference}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="mr-1.5 size-3.5" />
          Modifier
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Informations</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Coordonnées" value={`${panel.lat.toFixed(6)}, ${panel.lng.toFixed(6)}`} />
              <InfoRow icon={MapPin} label="Adresse" value={panel.address || '—'} />
              <InfoRow icon={MapPin} label="Ville" value={panel.city || '—'} />
              <InfoRow icon={Calendar} label="Type" value={panel.type || defaultTypeName || '—'} />
              <InfoRow icon={Calendar} label="Installé le" value={panel.installed_at ? new Date(panel.installed_at).toLocaleDateString('fr-FR') : '—'} />
              <InfoRow icon={Calendar} label="Dernière vérification" value={panel.last_checked_at ? new Date(panel.last_checked_at).toLocaleDateString('fr-FR') : '—'} />
            </div>
            {panel.notes && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">{panel.notes}</p>
              </div>
            )}
          </div>

          {/* Campaign history */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <h3 className="font-semibold">Historique campagnes</h3>
            </div>
            {!assignments?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune campagne assignée</p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assignments.map((a) => {
                  const campaign = (a as Record<string, unknown>).campaigns as { name: string; client_id: string | null; clients: { company_name: string } | null } | null
                  return (
                    <div key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {campaign?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {campaign?.clients?.company_name ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.assigned_at).toLocaleDateString('fr-FR')}
                        </p>
                        {a.unassigned_at ? (
                          <span className="text-xs text-muted-foreground">
                            → {new Date(a.unassigned_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600">En cours</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Photos gallery */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <h3 className="font-semibold">Photos ({photos?.length ?? 0})</h3>
            </div>
            {!photos?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Aucune photo</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => setViewerIndex(idx)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg"
                  >
                    <img
                      src={getPhotoUrl(photo.storage_path)}
                      alt={photo.photo_type}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-2 py-1">
                      <p className="text-xs text-white">{photo.photo_type}</p>
                      <p className="text-xs text-white/70">
                        {new Date(photo.taken_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Location & Contract */}
        <div className="space-y-6">
          {/* Location link */}
          {panel.location_id && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Lieu</h3>
              <Link
                to={`/admin/locations/${panel.location_id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {panel.locations?.name || 'Voir le lieu'}
                  </p>
                  {panel.zone_label && (
                    <p className="text-xs text-muted-foreground">
                      Zone : {panel.zone_label.startsWith('custom:')
                        ? panel.zone_label.slice(7)
                        : PANEL_ZONES.find((z) => z.value === panel.zone_label)?.label ?? panel.zone_label}
                    </p>
                  )}
                </div>
              </Link>

              {/* Contract shortcut */}
              {contract && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-border p-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Contrat N° {contract.contract_number.replace(/^CONT-/, '')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contract.status === 'signed' ? 'Signé' :
                       contract.status === 'amended' ? 'Avenant(s)' : 'Résilié'}
                    </p>
                  </div>
                  {contract.storage_path && (
                    <button
                      onClick={async () => {
                        const { data, error } = await supabase.storage
                          .from('panel-photos')
                          .createSignedUrl(contract.storage_path!, 3600)
                        if (error || !data?.signedUrl) {
                          toast('Erreur lors de l\'ouverture du PDF', 'error')
                          return
                        }
                        setContractPdfUrl(data.signedUrl)
                      }}
                      className="rounded-md p-1.5 transition-colors hover:bg-muted"
                      title="Voir le contrat"
                    >
                      <Eye className="size-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Panel reference */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-2 font-semibold">Référence</h3>
            <p className="font-mono text-sm text-muted-foreground">{panel.reference}</p>
          </div>
        </div>
      </div>

      {/* Full-screen photo viewer */}
      {viewerIndex !== null && photos && photos[viewerIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewerIndex(null)}
        >
          {/* Close */}
          <button
            onClick={() => setViewerIndex(null)}
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-6" />
          </button>

          {/* Previous */}
          {viewerIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex - 1) }}
              className="absolute left-4 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Next */}
          {viewerIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex + 1) }}
              className="absolute right-4 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={getPhotoUrl(photos[viewerIndex].storage_path)}
            alt={photos[viewerIndex].photo_type}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
            {photos[viewerIndex].photo_type} — {new Date(photos[viewerIndex].taken_at).toLocaleDateString('fr-FR')}
            <span className="ml-2 text-white/50">{viewerIndex + 1}/{photos.length}</span>
          </div>
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Modifier le panneau</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nom</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom du panneau" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Statut</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {PANEL_STATUSES.map((s) => (
                  <option key={s} value={s}>{PANEL_STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Adresse</label>
              <Input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} placeholder="Adresse" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ville</label>
              <Input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ville" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Format</label>
              <Input value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} placeholder="Type" className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                placeholder="Notes internes..."
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={handleSavePanel} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Mettre à jour
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Contract PDF Modal */}
      {contractPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setContractPdfUrl(null)}>
          <div className="relative h-[90vh] w-[90vw] max-w-4xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-medium">Contrat — {contract?.contract_number}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(contractPdfUrl, '_blank')}>
                  <ExternalLink className="mr-1.5 size-3.5" /> Ouvrir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setContractPdfUrl(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <iframe src={contractPdfUrl} className="h-[calc(100%-3.5rem)] w-full rounded-b-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}
