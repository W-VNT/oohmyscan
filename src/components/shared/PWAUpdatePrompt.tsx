import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <RefreshCw className="size-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-[13px]">Nouvelle version disponible</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  )
}
