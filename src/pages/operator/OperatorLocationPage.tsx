import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLocation as useLocationData, useLocationPanels, useLocationContract } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Landmark, MapPin, Phone, Mail, PanelTop, FileCheck, Calendar, Download, Loader2 } from 'lucide-react'
import { PANEL_ZONES, PANEL_STATUS_CONFIG } from '@/lib/constants'
import type { PanelStatus } from '@/lib/constants'

export function OperatorLocationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: location, isLoading } = useLocationData(id)
  const { data: panels } = useLocationPanels(id)
  const { data: contract } = useLocationContract(id)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-medium">Lieu non trouvé</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary underline">
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[15px] font-semibold">{location.name}</h1>
      </div>

      <div className="space-y-4 p-4">
        {/* Location info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Landmark className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[13px] font-medium">{location.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {location.address}, {location.postal_code} {location.city}
              </p>
            </div>
          </div>

          {location.phone && (
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              <a href={`tel:${location.phone}`} className="text-[13px] text-primary">
                {location.phone}
              </a>
            </div>
          )}

          {location.owner_email && (
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <a href={`mailto:${location.owner_email}`} className="text-[13px] text-primary">
                {location.owner_email}
              </a>
            </div>
          )}

          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Bailleur
            </p>
            <p className="mt-1 text-[13px] font-medium">
              {location.owner_first_name} {location.owner_last_name}
            </p>
            <p className="text-[12px] text-muted-foreground">{location.owner_role}</p>
          </div>

          {location.closing_months && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Période de fermeture
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{location.closing_months}</p>
            </div>
          )}
        </div>

        {/* Panels */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Panneaux ({panels?.length ?? 0})
          </p>
          <div className="mt-2 space-y-2">
            {panels?.map((panel) => {
              const status = PANEL_STATUS_CONFIG[panel.status as PanelStatus]
              return (
                <Link
                  key={panel.id}
                  to={`/app/panels/${panel.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors active:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <PanelTop className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-[13px] font-medium">
                        {panel.zone_label
                          ? panel.zone_label.startsWith('custom:') ? panel.zone_label.slice(7) : PANEL_ZONES.find((z) => z.value === panel.zone_label)?.label ?? panel.zone_label
                          : panel.reference}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{panel.reference}</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status?.bg ?? ''}`}>
                    {status?.label ?? panel.status}
                  </div>
                </Link>
              )
            })}
            {(!panels || panels.length === 0) && (
              <p className="py-4 text-center text-[13px] text-muted-foreground">
                Aucun panneau rattaché
              </p>
            )}
          </div>
        </div>

        {/* Contract */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Contrat
          </p>
          {contract ? (
            <div className="mt-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <FileCheck className="size-4 shrink-0 text-green-600" />
                <div>
                  <p className="text-[13px] font-medium">{contract.contract_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Signé le {new Date(contract.signed_at).toLocaleDateString('fr-FR')}
                    {contract.signed_city && ` à ${contract.signed_city}`}
                  </p>
                </div>
              </div>
              {contract.storage_path && (
                <button
                  onClick={async () => {
                    const { data, error } = await supabase.storage
                      .from('panel-photos')
                      .createSignedUrl(contract.storage_path!, 3600)
                    if (error || !data?.signedUrl) return
                    window.open(data.signedUrl, '_blank')
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-[12px] font-medium text-primary transition-colors active:bg-muted/50"
                >
                  <Download className="size-3.5" />
                  Voir le PDF
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 py-4 text-center text-[13px] text-muted-foreground">
              Aucun contrat signé
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
