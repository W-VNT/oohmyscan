import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLocation, useLocationPanels, useLocationContract, useContractAmendments, useUpdateLocation } from '@/hooks/useLocations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PANEL_ZONES } from '@/lib/constants'
import { ArrowLeft, Loader2, PanelTop, Phone, Mail, MapPin, Calendar, Pencil, Eye, X, ExternalLink } from 'lucide-react'
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

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: location, isLoading } = useLocation(id)
  const { data: panels } = useLocationPanels(id)
  const { data: contract } = useLocationContract(id)
  const { data: amendments } = useContractAmendments(contract?.id)
  const updateLocation = useUpdateLocation()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null)
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
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{location.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {location.address}, {location.postal_code} {location.city}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="mr-1.5 size-3.5" />
            Modifier
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info lieu */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations
            </h2>

            {editing ? (
              <div className="space-y-4">
                {/* Nom */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Nom</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>

                  {/* Adresse */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Adresse</label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>

                  {/* Code postal / Ville */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Code postal</label>
                    <Input
                      value={editForm.postal_code}
                      onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Ville</label>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">Téléphone</label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
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
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Nom</label>
                      <Input
                        value={editForm.owner_last_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_last_name: e.target.value }))}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Fonction</label>
                      <Input
                        value={editForm.owner_role}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_role: e.target.value }))}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={editForm.owner_email}
                        onChange={(e) => setEditForm((f) => ({ ...f, owner_email: e.target.value }))}
                        className="h-9 rounded-lg text-sm"
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
                    className="h-9 rounded-lg text-sm"
                  />
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving || !editForm.name.trim()}>
                    {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
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
                    <button
                      onClick={() => openContractPdf(contract.storage_path!)}
                      className="rounded-md p-1.5 transition-colors hover:bg-muted"
                      title="Voir le contrat"
                    >
                      <Eye className="size-4 text-muted-foreground" />
                    </button>
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
    </div>
  )
}
