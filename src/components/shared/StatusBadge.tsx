import { Badge } from '@/components/ui/badge'
import type { PanelStatus } from '@/lib/constants'

const statusConfig: Record<PanelStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  vacant: { label: 'Vacant', variant: 'secondary' },
  missing: { label: 'Manquant', variant: 'destructive' },
  maintenance: { label: 'Maintenance', variant: 'outline' },
}

interface StatusBadgeProps {
  status: PanelStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
