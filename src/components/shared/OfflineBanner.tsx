import { useState } from 'react'
import { WifiOff, Loader2, CloudUpload, FileCheck, X } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

/**
 * Bandeau discret en haut d'écran qui indique le statut sync.
 * Tap = ouvre un mini menu avec l'action "Vider la queue" en cas de blocage.
 */
export function OfflineBanner() {
  const { pendingCount, pendingInstallCount, online, syncing, clearAll } = useOfflineSync()
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const hasPending = pendingCount > 0 || pendingInstallCount > 0

  if (online && !hasPending && !syncing) return null

  const summary: string[] = []
  if (pendingCount > 0) summary.push(`${pendingCount} photo${pendingCount > 1 ? 's' : ''}`)
  if (pendingInstallCount > 0) summary.push(`${pendingInstallCount} install${pendingInstallCount > 1 ? 's' : ''}`)
  const summaryText = summary.join(' · ')

  const bg = !online ? 'bg-orange-500/95' : 'bg-blue-500/95'
  const icon = !online ? (
    <WifiOff className="size-3.5" />
  ) : syncing ? (
    <Loader2 className="size-3.5 animate-spin" />
  ) : pendingInstallCount > 0 ? (
    <FileCheck className="size-3.5" />
  ) : (
    <CloudUpload className="size-3.5" />
  )

  const label = !online
    ? 'Hors ligne'
    : syncing
      ? 'Synchronisation'
      : 'Envoi différé'

  async function handleClear() {
    setClearing(true)
    try {
      await clearAll()
      setOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 ${bg} px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur`}
      >
        {icon}
        <span>{label}</span>
        {hasPending && <span className="opacity-80">· {summaryText}</span>}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/30"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-[calc(env(safe-area-inset-top)+40px)] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-background p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold">Synchronisation</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {hasPending
                    ? `${summaryText} en attente de synchronisation avec le serveur.`
                    : "Aucune donnée locale en attente."}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            {hasPending && (
              <button
                onClick={handleClear}
                disabled={clearing}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] font-medium text-destructive transition-colors active:bg-destructive/10 disabled:opacity-50"
              >
                {clearing && <Loader2 className="size-3.5 animate-spin" />}
                Vider la queue (données perdues)
              </button>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Si le badge reste bloqué, la queue peut contenir des données
              qui n'arrivent pas à être envoyées (contrat trop vieux, panneau
              supprimé côté admin, etc.). Vider la queue résout le blocage
              mais tu perdras ces installations non synchronisées.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
