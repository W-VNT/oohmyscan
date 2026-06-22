import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Action {
  label: string
  onClick: () => void
  icon?: LucideIcon
  variant?: 'default' | 'outline'
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: Action
  /**
   * - `default` : pleine page (liste vide)
   * - `compact` : compact, pour les résultats vides après filtre
   * - `inline` : minimal, pour sous-sections (ex: "Aucune photo")
   */
  size?: 'default' | 'compact' | 'inline'
}

export function EmptyState({ icon: Icon, title, description, action, size = 'default' }: EmptyStateProps) {
  if (size === 'inline') {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
        <Icon className="size-8" />
        <p className="text-sm">{title}</p>
      </div>
    )
  }

  if (size === 'compact') {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Icon className="size-8" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-xs text-xs">{description}</p>}
        {action && (
          <Button
            variant={action.variant ?? 'outline'}
            size="sm"
            onClick={action.onClick}
            className="mt-2"
          >
            {action.icon && <action.icon className="mr-1.5 size-3.5" />}
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  // default — full empty state with circle background
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant ?? 'default'}
          size="sm"
          onClick={action.onClick}
        >
          {action.icon && <action.icon className="mr-1.5 size-3.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
