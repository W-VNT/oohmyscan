import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLocation, useLocationPanels, useLocationContract, useContractAmendments } from '@/hooks/useLocations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, PanelTop, FileText, Phone, Mail, MapPin, Download, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/shared/Toast'
import type { PanelStatus } from '@/lib/constants'

async function downloadPDF(storagePath: string, filename: string) {
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
        <div>
          <h1 className="text-xl font-semibold">{location.name}</h1>
          <p className="text-sm text-muted-foreground">
            {location.address}, {location.postal_code} {location.city}
          </p>
        </div>
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
                          {panel.zone_label || panel.reference}
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
    </div>
  )
}
