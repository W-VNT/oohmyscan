import { cn } from '@/lib/utils'
import type { PanelStatus } from '@/lib/constants'

const statusConfig: Record<PanelStatus, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-green-500/15 text-green-600' },
  vacant: { label: 'Vacant', className: 'bg-gray-500/15 text-gray-500' },
  missing: { label: 'Manquant', className: 'bg-red-500/15 text-red-600' },
  maintenance: { label: 'Maintenance', className: 'bg-orange-500/15 text-orange-600' },
}

interface StatusBadgeProps {
  status: PanelStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
