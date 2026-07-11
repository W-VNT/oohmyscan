import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLocation, useLocationPanels, useLocationContract, useContractAmendments, useUpdateLocation, useDeleteLocation, useDeleteContract } from '@/hooks/useLocations'
import { useLocationFreePanels } from '@/hooks/admin/useLocationFreePanels'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PANEL_ZONES } from '@/lib/constants'
import { ArrowLeft, Loader2, PanelTop, Phone, Mail, MapPin, Calendar, Pencil, Eye, X, ExternalLink, Trash2, FileText, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import type { PanelStatus } from '@/lib/constants'

interface EditForm {
  name: string
  address: string
  postal_code: string
  city: string
  phone: string
  owner_first_name: string
  owner_last_name: string
  owner_role: string
  owner_email: string
  closing_months: string
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: location, isLoading } = useLocation(id)
  const { data: panels } = useLocationPanels(id)
  const { data: freePanels } = useLocationFreePanels(id)
  const { data: contract } = useLocationContract(id)
  const { data: amendments } = useContractAmendments(contract?.id)
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()
  const deleteContract = useDeleteContract()
  const confirm = useConfirm()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // Champs figures dans le contrat signé — on les verrouille pour eviter
  // les incoherences avec le PDF deja signe. Modifiable uniquement via
  // un avenant (workflow non expose ici).
  const hasSignedContract = !!contract
  const isFieldLocked = hasSignedContract
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', address: '', postal_code: '', city: '', phone: '',
    owner_first_name: '', owner_last_name: '', owner_role: '', owner_email: '', closing_months: '',
  })

  function openEdit() {
    if (!location) return
    setEditForm({
      name: location.name,
      address: location.address,
      postal_code: location.postal_code,
      city: location.city,
      phone: location.phone || '',
      owner_first_name: location.owner_first_name,
      owner_last_name: location.owner_last_name,
      owner_role: location.owner_role || '',
      owner_email: location.owner_email || '',
      closing_months: location.closing_months || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!location) return
    if (!editForm.name.trim()) {
      toast('Le nom est obligatoire', 'error')
      return
    }
    setSaving(true)
    try {
      await updateLocation.mutateAsync({ id: location.id, ...editForm })
      toast('Lieu mis à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function openContractPdf(storagePath: string) {
    const { data, error } = await supabase.storage
      .from('panel-photos')
      .createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) {
      toast('Erreur lors de l\'ouverture du PDF', 'error')
      return
    }
    setContractPdfUrl(data.signedUrl)
  }

  const [resending, setResending] = useState(false)
  async function handleResendContract(storagePath: string, contractNumber: string) {
    if (!location?.owner_email) {
      toast('Pas d\'email bailleur renseigne sur ce lieu', 'error')
      return
    }
    setResending(true)
    try {
      // Fetch PDF from Storage
      const { data: blob, error: dlErr } = await supabase.storage
        .from('panel-photos')
        .download(storagePath)
      if (dlErr || !blob) throw new Error(dlErr?.message ?? 'Impossible de recuperer le PDF')

      // Blob -> base64 (sans le prefixe data:)
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
      }
      const pdfBase64 = btoa(binary)

      // Sujet + corps generiques (les templates admin sont dans company_settings
      // mais on n'a pas encore l'interpolation ici — on garde un mail simple).
      const subject = `Contrat ${contractNumber} — renvoi`
      const html = `<p>Bonjour ${location.owner_first_name ?? ''},</p><p>Vous trouverez ci-joint votre contrat d'installation N° ${contractNumber}.</p>`

      const { error: invokeErr, data } = await supabase.functions.invoke('send-document-email', {
        body: {
          to: location.owner_email,
          subject,
          html,
          pdfBase64,
          pdfFilename: `contrat-${contractNumber}.pdf`,
          documentType: 'contract',
        },
      })
      if (invokeErr) throw invokeErr
      if (data?.error) throw new Error(data.error)
      toast(`Contrat renvoye a ${location.owner_email}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur envoi email', 'error')
    } finally {
      setResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Lieu non trouvé</p>
        <Button variant="link" onClick={() => navigate('/admin/locations')}>
          Retour aux lieux
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header — stack en mobile, ligne unique desktop */}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/locations')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold sm:text-xl">{location.name}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {location.address}, {location.postal_code} {location.city}
          </p>
        </div>
        {!editing && (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={openEdit} className="flex-1 sm:flex-none">
              <Pencil className="mr-1.5 size-3.5" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive sm:flex-none"
              onClick={async () => {
                if (!id) return
                const ok = await confirm({
                  title: `Supprimer "${location.name}" ?`,
                  description: 'Cette action est irréversible. Les contrats et avenants liés seront supprimés. Les panneaux du lieu seront orphelinés (location vidée).',
                  confirmLabel: 'Supprimer',
                  variant: 'destructive',
                })
                if (!ok) return
                try {
                  await deleteLocation.mutateAsync(id)
                  toast('Lieu supprimé')
                  navigate('/admin/locations')
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Erreur', 'error')
                }
              }}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info lieu — prend toute la largeur si aucun panneau QR (evite carte vide) */}
        <Card className={!panels?.length ? 'lg:col-span-2' : ''}>
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations
            </h2>

            {editing ? (
              <div className="space-y-4">
                {isFieldLocked && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-400">
                    <p className="font-medium">Contrat signé — champs verrouillés</p>
                    <p className="mt-1 opacity-90">
                      Le nom, l'adresse, le téléphone et les infos du bailleur figurent sur le contrat n° {contract?.contract_number} déjà signé. Pour les modifier, il faut passer par un avenant. Seuls les mois de fermeture restent modifiables.
                    </p>
                  </div>
                )}
                {/* Nom */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Nom</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={isFieldLocked}
                      className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Adresse */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Adresse</label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      disabled={isFieldLocked}
                      className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Code postal / Ville */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Code postal</label>
                    <Input
                      value={editForm.postal_code}
                      onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value }))}
                      disabled={isFieldLocked}
                      className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Ville</label>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      disabled={isFieldLocked}
                      className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Téléphone</label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      disabled={isFieldLocked}
                      className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Bailleur section */}
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bailleur</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Prénom</label>
                      <Input
                        value={editForm.owner_first_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_first_name: e.target.value }))}
                        disabled={isFieldLocked}
                        className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Nom</label>
                      <Input
                        value={editForm.owner_last_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_last_name: e.target.value }))}
                        disabled={isFieldLocked}
                        className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Fonction</label>
                      <Input
                        value={editForm.owner_role}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_role: e.target.value }))}
                        disabled={isFieldLocked}
                        className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={editForm.owner_email}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_email: e.target.value }))}
                        disabled={isFieldLocked}
                        className="h-10 rounded-lg text-sm sm:h-9 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Fermeture */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Mois de fermeture</label>
                  <Input
                    value={editForm.closing_months}
                    onChange={(e) => setEditForm((f) => ({ ...f, closing_months: e.target.value }))}
                    placeholder="ex: Août, Décembre"
                    className="h-10 rounded-lg text-sm sm:h-9"
                  />
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving || !editForm.name.trim()} className="flex-1 sm:flex-none">
                    {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 sm:flex-none">
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p>{location.address}</p>
                    <p className="text-muted-foreground">{location.postal_code} {location.city}</p>
                  </div>
                </div>
                {location.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-muted-foreground" />
                    <a href={`tel:${location.phone}`} className="text-primary hover:underline">
                      {location.phone}
                    </a>
                  </div>
                )}
                {location.owner_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground" />
                    <a href={`mailto:${location.owner_email}`} className="text-primary hover:underline">
                      {location.owner_email}
                    </a>
                  </div>
                )}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bailleur</p>
                  <p className="font-medium">
                    {location.owner_first_name} {location.owner_last_name}
                  </p>
                  <p className="text-muted-foreground">{location.owner_role}</p>
                </div>
                {location.closing_months && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fermeture</p>
                    <p className="text-muted-foreground">{location.closing_months}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panneaux QR — cachee si aucun panneau. Reapparaitra automatiquement
            si un jour un panneau QR est ajoute a ce lieu via install wizard. */}
        {panels && panels.length > 0 && (
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Panneaux ({panels.length})
                </h2>
              </div>
              <div className="space-y-1.5">
                {panels.map((panel) => (
                  <Link
                    key={panel.id}
                    to={`/admin/panels/${panel.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <PanelTop className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {panel.zone_label
                          ? (panel.zone_label.startsWith('custom:')
                              ? panel.zone_label.slice(7)
                              : PANEL_ZONES.find((z) => z.value === panel.zone_label)?.label ?? panel.zone_label)
                          : panel.name || panel.reference}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="font-mono">{panel.reference}</code>
                        {panel.type && <span>· {panel.type}</span>}
                      </div>
                    </div>
                    <StatusBadge status={panel.status as PanelStatus} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Panneaux libres (poses sans QR liees a ce lieu) */}
        {freePanels && freePanels.length > 0 && (
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Panneaux libres ({freePanels.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {freePanels.map((fp, idx) => {
                  const publicUrl = supabase.storage
                    .from('panel-photos')
                    .getPublicUrl(fp.photo_path).data.publicUrl
                  return (
                    <button
                      key={fp.id}
                      type="button"
                      onClick={() => setViewerIndex(idx)}
                      className="group relative overflow-hidden rounded-lg border border-border text-left transition-transform hover:scale-[1.02]"
                    >
                      <img
                        src={publicUrl}
                        alt={`Panneau libre ${fp.campaign?.name ?? ''}`}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2">
                        <p className="truncate text-[11px] font-medium text-white">
                          {fp.campaign?.name ?? 'Campagne inconnue'}
                        </p>
                        <p className="truncate text-[10px] text-white/80">
                          {new Date(fp.created_at).toLocaleDateString('fr-FR')}
                          {fp.operator?.full_name && ` · ${fp.operator.full_name}`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contrat */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Contrat
          </h2>
          {!contract ? (
            <EmptyState icon={FileText} title="Aucun contrat signé" size="inline" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{contract.contract_number}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Signé le {new Date(contract.signed_at).toLocaleDateString('fr-FR')}
                    {contract.signed_city && ` à ${contract.signed_city}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                    contract.status === 'signed' ? 'bg-green-500/15 text-green-600' :
                    contract.status === 'amended' ? 'bg-blue-500/15 text-blue-600' :
                    'bg-red-500/15 text-red-600'
                  }`}>
                    {contract.status === 'signed' ? 'Signé' :
                     contract.status === 'amended' ? 'Avenant(s)' : 'Résilié'}
                  </span>
                  {contract.storage_path && (
                    <button
                      onClick={() => openContractPdf(contract.storage_path!)}
                      className="rounded-md p-1.5 transition-colors hover:bg-muted"
                      title="Voir le contrat"
                    >
                      <Eye className="size-4 text-muted-foreground" />
                    </button>
                  )}
                  {contract.storage_path && location?.owner_email && (
                    <button
                      onClick={() => handleResendContract(contract.storage_path!, contract.contract_number)}
                      disabled={resending}
                      className="rounded-md p-1.5 transition-colors hover:bg-muted disabled:opacity-50"
                      title={`Renvoyer le contrat a ${location.owner_email}`}
                    >
                      {resending ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Send className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const amendCount = amendments?.length ?? 0
                      const ok = await confirm({
                        title: `Supprimer le contrat ${contract.contract_number} ?`,
                        description: amendCount > 0
                          ? `Cette action est irréversible. ${amendCount} avenant${amendCount > 1 ? 's seront supprimés' : ' sera supprimé'} aussi.`
                          : 'Cette action est irréversible.',
                        confirmLabel: 'Supprimer',
                        variant: 'destructive',
                      })
                      if (!ok) return
                      try {
                        await deleteContract.mutateAsync(contract.id)
                        toast('Contrat supprimé')
                      } catch (e) {
                        toast(e instanceof Error ? e.message : 'Erreur', 'error')
                      }
                    }}
                    className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    title="Supprimer le contrat"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Avenants */}
              {amendments && amendments.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Avenants ({amendments.length})
                  </p>
                  <div className="space-y-2">
                    {amendments.map((amendment) => (
                      <div
                        key={amendment.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{amendment.amendment_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {amendment.reason === 'panel_added' && 'Ajout de panneau'}
                            {amendment.reason === 'panel_removed' && 'Retrait de panneau'}
                            {amendment.reason === 'terms_updated' && 'Modification des termes'}
                            {' · '}
                            {amendment.signed_at
                              ? new Date(amendment.signed_at).toLocaleDateString('fr-FR')
                              : '—'}
                          </p>
                        </div>
                        {amendment.storage_path && (
                          <button
                            onClick={() => openContractPdf(amendment.storage_path!)}
                            className="rounded-md p-1.5 transition-colors hover:bg-muted"
                            title="Voir l'avenant"
                          >
                            <Eye className="size-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract PDF Modal */}
      {contractPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setContractPdfUrl(null)}>
          <div className="relative h-[90vh] w-[90vw] max-w-4xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-medium">
                Contrat — {contract?.contract_number}
              </p>
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

      {/* Fullscreen photo viewer — panneaux libres */}
      {viewerIndex !== null && freePanels && freePanels[viewerIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewerIndex(null)}
        >
          <button
            onClick={() => setViewerIndex(null)}
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="size-6" />
          </button>

          {viewerIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex - 1) }}
              className="absolute left-4 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Précédente"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {viewerIndex < freePanels.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex + 1) }}
              className="absolute right-4 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Suivante"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          <img
            src={supabase.storage.from('panel-photos').getPublicUrl(freePanels[viewerIndex].photo_path).data.publicUrl}
            alt={`Panneau libre ${freePanels[viewerIndex].campaign?.name ?? ''}`}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
            {freePanels[viewerIndex].campaign?.name ?? 'Campagne inconnue'}
            {' — '}
            {new Date(freePanels[viewerIndex].created_at).toLocaleDateString('fr-FR')}
            {freePanels[viewerIndex].operator?.full_name && ` · ${freePanels[viewerIndex].operator.full_name}`}
            <span className="ml-2 text-white/50">{viewerIndex + 1}/{freePanels.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
