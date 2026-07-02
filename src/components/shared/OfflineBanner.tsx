import { WifiOff, Loader2, CloudUpload, FileCheck } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

/**
 * Bandeau discret en haut d'écran qui indique :
 *  - Hors ligne : "Hors ligne · X photo(s) / Y install(s) en attente"
 *  - Sync en cours : "Envoi · X photos + Y installs"
 *  - Éléments en attente (online) : "Envoi différé · X + Y"
 *
 * Nothing s'affiche si en ligne + tout est sync.
 */
export function OfflineBanner() {
  const { pendingCount, pendingInstallCount, online, syncing } = useOfflineSync()

  const hasPending = pendingCount > 0 || pendingInstallCount > 0

  if (online && !hasPending && !syncing) return null

  // Résumé "X photo · Y install"
  const summary: string[] = []
  if (pendingCount > 0) summary.push(`${pendingCount} photo${pendingCount > 1 ? 's' : ''}`)
  if (pendingInstallCount > 0) summary.push(`${pendingInstallCount} install${pendingInstallCount > 1 ? 's' : ''}`)
  const summaryText = summary.join(' · ')

  // Cas 1 : hors ligne
  if (!online) {
    return (
      <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 bg-orange-500/95 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
        <WifiOff className="size-3.5" />
        <span>Hors ligne</span>
        {hasPending && <span className="opacity-80">· {summaryText} en attente</span>}
      </div>
    )
  }

  // Cas 2 : en ligne, sync en cours ou éléments en attente
  return (
    <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 bg-blue-500/95 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
      {syncing ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : pendingInstallCount > 0 ? (
        <FileCheck className="size-3.5" />
      ) : (
        <CloudUpload className="size-3.5" />
      )}
      <span>
        {syncing ? 'Synchronisation' : 'Envoi différé'} · {summaryText}
      </span>
    </div>
  )
}
