import { Link } from 'react-router-dom'
import { usePanels } from '@/hooks/usePanels'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Loader2, PanelTop } from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'

export function OperatorPanelsPage() {
  const { data: panels, isLoading } = usePanels()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Panneaux</h1>

      {!panels?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PanelTop className="h-12 w-12" />
          <p className="mt-4">Aucun panneau enregistré</p>
        </div>
      ) : (
        <div className="space-y-2">
          {panels.map((panel) => (
            <Link
              key={panel.id}
              to={`/assign/${panel.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div>
                <p className="font-medium">{panel.reference}</p>
                <p className="text-sm text-muted-foreground">
                  {panel.name || panel.city || '—'}
                </p>
              </div>
              <StatusBadge status={panel.status as PanelStatus} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
