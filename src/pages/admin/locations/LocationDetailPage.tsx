import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLocation, useLocationPanels, useLocationContract, useContractAmendments, useUpdateLocation } from '@/hooks/useLocations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PANEL_ZONES } from '@/lib/constants'
import { ArrowLeft, Loader2, PanelTop, FileText, Phone, Mail, MapPin, Download, Calendar, Pencil } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/shared/Toast'
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

async function downloadPDF(storagePath: string, _filename: string) {
  const { data, error } = await supabase.storage
    .from('panel-photos')
    .createSignedUrl(storagePath, 3600)
  if (error || !data?.signedUrl) {
    toast('Erreur lors du téléchargement du PDF', 'error')
    return
  }
  window.open(data.signedUrl, '_blank')
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: location, isLoading } = useLocation(id)
  const { data: panels } = useLocationPanels(id)
  const { data: contract } = useLocationContract(id)
  const { data: amendments } = useContractAmendments(contract?.id)
  const updateLocation = useUpdateLocation()

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
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
    setEditOpen(true)
  }

  async function handleSave() {
    if (!location) return
    setSaving(true)
    try {
      await updateLocation.mutateAsync({ id: location.id, ...editForm })
      toast('Lieu mis à jour')
      setEditOpen(false)
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    } finally {
      setSaving(false)
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/locations')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{location.name}</h1>
          <p className="text-sm text-muted-foreground">
            {location.address}, {location.postal_code} {location.city}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="mr-1.5 size-3.5" />
          Modifier
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info lieu */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations
            </h2>
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
          </CardContent>
        </Card>

        {/* Panneaux */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Panneaux ({panels?.length ?? 0})
              </h2>
            </div>
            {!panels?.length ? (
              <p className="text-sm text-muted-foreground">Aucun panneau rattaché à ce lieu.</p>
            ) : (
              <div className="space-y-2">
                {panels.map((panel) => (
                  <Link
                    key={panel.id}
                    to={`/admin/panels/${panel.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <PanelTop className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {panel.zone_label
                            ? (panel.zone_label.startsWith('custom:')
                                ? panel.zone_label.slice(7)
                                : PANEL_ZONES.find((z) => z.value === panel.zone_label)?.label ?? panel.zone_label)
                            : panel.reference}
                        </p>
                        <p className="text-xs text-muted-foreground">{panel.reference}</p>
                      </div>
                    </div>
                    <StatusBadge status={panel.status as PanelStatus} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contrat */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Contrat
          </h2>
          {!contract ? (
            <p className="text-sm text-muted-foreground">Aucun contrat signé pour ce lieu.</p>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPDF(contract.storage_path!, contract.contract_number)}
                    >
                      <Download className="mr-1.5 size-3.5" />
                      PDF
                    </Button>
                  )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadPDF(amendment.storage_path!, amendment.amendment_number)}
                          >
                            <FileText className="size-3.5" />
                          </Button>
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

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modifier le lieu</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nom</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Adresse</label>
              <Input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Code postal</label>
                <Input value={editForm.postal_code} onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ville</label>
                <Input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Téléphone</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bailleur</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prénom</label>
                    <Input value={editForm.owner_first_name} onChange={(e) => setEditForm((f) => ({ ...f, owner_first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nom</label>
                    <Input value={editForm.owner_last_name} onChange={(e) => setEditForm((f) => ({ ...f, owner_last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fonction</label>
                  <Input value={editForm.owner_role} onChange={(e) => setEditForm((f) => ({ ...f, owner_role: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                  <Input type="email" value={editForm.owner_email} onChange={(e) => setEditForm((f) => ({ ...f, owner_email: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mois de fermeture</label>
              <Input
                value={editForm.closing_months}
                onChange={(e) => setEditForm((f) => ({ ...f, closing_months: e.target.value }))}
                placeholder="ex: Août, Décembre"
              />
            </div>

            <Button onClick={handleSave} disabled={saving || !editForm.name.trim()} className="w-full">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
