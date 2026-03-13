import { MapPin, PanelTop, User, Gift } from 'lucide-react'
import type { Location } from '@/types'
import { PANEL_ZONES } from '@/lib/constants'

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

interface ContractPreviewProps {
  type: 'contract' | 'amendment'
  location: Location
  panels: PanelSnapshot[]
  newPanel?: PanelSnapshot
  originalContractNumber?: string
}

function zoneLabel(value: string): string {
  if (value.startsWith('custom:')) return value.slice(7)
  return PANEL_ZONES.find((z) => z.value === value)?.label ?? value
}

export function ContractPreview({
  type,
  location,
  panels,
  newPanel,
  originalContractNumber,
}: ContractPreviewProps) {
  const pointsTotal = panels.length * 50

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {type === 'contract' ? 'Aperçu du contrat' : 'Aperçu de l\'avenant'}
      </p>

      <div className="rounded-lg border border-border bg-white p-4 text-sm dark:bg-card">
        {/* Title */}
        <div className="border-b border-border pb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {type === 'contract'
              ? 'Autorisation d\'installation de supports publicitaires'
              : `Avenant — Contrat ${originalContractNumber}`}
          </p>
        </div>

        {/* Establishment */}
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">{location.name}</p>
              <p className="text-muted-foreground">
                {location.address}, {location.postal_code} {location.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {location.owner_first_name} {location.owner_last_name}
              </p>
              <p className="text-muted-foreground">{location.owner_role}</p>
            </div>
          </div>
        </div>

        {/* Amendment: new panel highlight */}
        {type === 'amendment' && newPanel && (
          <div className="mt-3 rounded-md bg-green-50 p-3 dark:bg-green-950/30">
            <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">Support ajouté</p>
            <div className="mt-1 flex items-center gap-2">
              <PanelTop className="size-3.5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-300">{zoneLabel(newPanel.zone_label)}</span>
              <span className="text-green-600">({newPanel.reference})</span>
            </div>
          </div>
        )}

        {/* Supports list */}
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {type === 'amendment' ? 'Supports après avenant' : 'Supports installés'}
            {' '}({panels.length})
          </p>
          <div className="space-y-1.5">
            {panels.map((p) => (
              <div key={p.panel_id} className="flex items-center gap-2">
                <PanelTop className="size-3.5 text-muted-foreground" />
                <span>{zoneLabel(p.zone_label)}</span>
                <span className="text-muted-foreground">— {p.reference}</span>
                {newPanel && p.panel_id === newPanel.panel_id && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    nouveau
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Format : 40 × 60 cm</p>
        </div>

        {/* Durée */}
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium">Durée : du 1er juin au 30 septembre</p>
        </div>

        {/* Points cadeaux */}
        <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
          <Gift className="size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Avantage partenaire</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              50 pts × {panels.length} support{panels.length !== 1 ? 's' : ''} = {pointsTotal} points ({pointsTotal} €)
            </p>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-3 border-t border-border pt-3 text-[10px] text-muted-foreground">
          <p>Signé électroniquement — eIDAS UE 910/2014</p>
        </div>
      </div>
    </div>
  )
}
