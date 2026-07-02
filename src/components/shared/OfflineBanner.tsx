import { WifiOff, Loader2, CloudUpload } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

/**
 * Bandeau discret en haut d'écran qui indique :
 *  - Hors ligne : "Hors ligne · N photo(s) en attente"
 *  - Sync en cours : "Envoi · N photo(s)"
 *  - N photos en attente (mais online) : "Envoi différé · N photo(s)"
 *
 * Nothing s'affiche si en ligne + queue vide + pas de sync.
 */
export function OfflineBanner() {
  const { pendingCount, online, syncing } = useOfflineSync()

  // Rien à afficher : tout est OK
  if (online && pendingCount === 0 && !syncing) return null

  // Cas 1 : hors ligne
  if (!online) {
    return (
      <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 bg-orange-500/95 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
        <WifiOff className="size-3.5" />
        <span>Hors ligne</span>
        {pendingCount > 0 && (
          <span className="opacity-80">
            · {pendingCount} photo{pendingCount > 1 ? 's' : ''} en attente
          </span>
        )}
      </div>
    )
  }

  // Cas 2 : en ligne, sync en cours ou photos en attente
  return (
    <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 bg-blue-500/95 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
      {syncing ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CloudUpload className="size-3.5" />
      )}
      <span>
        {syncing ? 'Envoi' : 'Envoi différé'}
        {' · '}
        {pendingCount} photo{pendingCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}
