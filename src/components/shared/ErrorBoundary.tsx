import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isChunkError: boolean
}

/**
 * Detecte les erreurs de chargement de chunks JS apres un nouveau deploiement :
 * l'index.html cache reference des noms de fichiers hashes qui n'existent plus.
 * Chrome/Safari renvoie un message specifique quand ils recoivent du HTML au
 * lieu de du JS (fallback SPA Vercel).
 */
function isChunkLoadError(err: Error | null): boolean {
  if (!err) return false
  const msg = err.message || ''
  return (
    msg.includes("'text/html' is not a valid JavaScript MIME type") ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    /Loading (?:CSS )?chunk \S+ failed/.test(msg) ||
    /Importing (?:a module|the module) script failed/.test(msg)
  )
}

const RELOAD_GUARD_KEY = '__chunk_reload_at'

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) }
  }

  componentDidCatch(error: Error) {
    // Chunk load error : reload la page automatiquement pour recuperer
    // le nouveau bundle. Guard anti-loop : si on a deja reload il y a
    // moins de 30s, on affiche l'ecran d'erreur plutot que de boucler.
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
      const now = Date.now()
      if (now - last > 30_000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(now))
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <h1 className="mt-4 text-base font-semibold">
              {this.state.isChunkError ? 'Nouvelle version disponible' : 'Une erreur est survenue'}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {this.state.isChunkError
                ? "L'application a été mise à jour. Recharge la page pour continuer."
                : this.state.error?.message || 'Erreur inattendue'}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem(RELOAD_GUARD_KEY)
                if (this.state.isChunkError) {
                  window.location.reload()
                } else {
                  this.setState({ hasError: false, error: null, isChunkError: false })
                  window.location.href = '/'
                }
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <RotateCcw className="size-3.5" />
              {this.state.isChunkError ? 'Recharger' : "Retour à l'accueil"}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
