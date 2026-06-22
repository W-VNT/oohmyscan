import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  /** Erreur retournée par React Query (ou message libre). */
  error?: unknown
  /** Callback de retry (typiquement refetch de la query). */
  onRetry?: () => void
  /** Titre court — défaut "Erreur de chargement". */
  title?: string
  /** Affichage compact (pour sous-sections). */
  size?: 'default' | 'compact'
}

function formatError(error: unknown): string {
  if (!error) return 'Une erreur inconnue est survenue'
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Une erreur inconnue est survenue'
}

export function ErrorState({ error, onRetry, title = 'Erreur de chargement', size = 'default' }: ErrorStateProps) {
  const message = formatError(error)

  if (size === 'compact') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
            <RefreshCw className="mr-1.5 size-3.5" />
            Réessayer
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Réessayer
        </Button>
      )}
    </div>
  )
}
