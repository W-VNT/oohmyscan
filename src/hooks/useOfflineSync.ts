import { useEffect, useState, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { countQueuedPhotos, clearQueuedPhotos } from '@/lib/offline-photo-queue'
import { processQueue } from '@/lib/photo-upload'
import {
  countPendingInstalls,
  clearPendingInstalls,
  listPendingInstalls,
  removePendingInstall,
  updatePendingInstall,
} from '@/lib/offline-mutation-queue'
import { toast } from '@/components/shared/Toast'

const MAX_INSTALL_ATTEMPTS = 5

/**
 * Rejoue toutes les installations en attente dans la queue mutation IDB.
 * Chaque install est rejouée via performInstallSave() — la fonction est
 * idempotente (matches panels par qr_code) donc un retry après un succès
 * partiel ne double pas les inserts.
 */
/** Wrap une promise dans un timeout : reject si l elle ne resout pas dans le delai. */
function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout apres ${ms}ms`)), ms)
    p.then((v) => { clearTimeout(timer); resolve(v) }, (e) => { clearTimeout(timer); reject(e) })
  })
}

async function processInstallQueue(): Promise<{ replayed: number; remaining: number; failed: number }> {
  if (!navigator.onLine) {
    return { replayed: 0, remaining: (await listPendingInstalls()).length, failed: 0 }
  }
  const queue = await listPendingInstalls()
  if (queue.length === 0) {
    return { replayed: 0, remaining: 0, failed: 0 }
  }
  // Dynamic import : react-pdf/renderer + PDF templates sont lourds (~400KB).
  // On ne les charge que quand il y a effectivement une install a rejouer.
  const { performInstallSave } = await import('@/lib/install-replay')
  let replayed = 0
  let failed = 0
  for (const item of queue) {
    if (item.attempts >= MAX_INSTALL_ATTEMPTS) {
      await removePendingInstall(item.id)
      failed++
      continue
    }
    try {
      await withTimeout(performInstallSave(item.payload), 30_000, 'performInstallSave')
      await removePendingInstall(item.id)
      replayed++
    } catch (e) {
      await updatePendingInstall(item.id, {
        attempts: item.attempts + 1,
        lastError: e instanceof Error ? e.message : String(e),
      })
    }
  }
  const remaining = (await listPendingInstalls()).length
  return { replayed, remaining, failed }
}

/**
 * Gère la sync automatique des photos ET des installations en attente.
 *  - Au montage : compte + tente une sync si en ligne
 *  - Au passage online : déclenche processQueue() + processInstallQueue()
 *  - Recompte périodiquement les badges (toutes les 15s)
 */
export function useOfflineSync() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingInstallCount, setPendingInstallCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    try {
      const [nPhotos, nInstalls] = await Promise.all([
        countQueuedPhotos(),
        countPendingInstalls(),
      ])
      setPendingCount(nPhotos)
      setPendingInstallCount(nInstalls)
    } catch {
      setPendingCount(0)
      setPendingInstallCount(0)
    }
  }, [])

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return
    // Skip early si les 2 queues sont vides : evite d'ouvrir IDB pour rien
    // et le flicker "Synchronisation" pour rien.
    const [nPhotos, nInstalls] = await Promise.all([countQueuedPhotos(), countPendingInstalls()])
    if (nPhotos === 0 && nInstalls === 0) {
      setPendingCount(0)
      setPendingInstallCount(0)
      return
    }
    setSyncing(true)
    try {
      await withTimeout(
        (async () => {
          if (nPhotos > 0) await processQueue()
          if (nInstalls > 0) {
            const res = await processInstallQueue()
            if (res.replayed > 0) {
              toast(`${res.replayed} installation${res.replayed > 1 ? 's' : ''} synchronisée${res.replayed > 1 ? 's' : ''}`)
            }
          }
        })(),
        60_000,
        'runSync',
      )
      await refreshCount()
    } catch (e) {
      console.warn('[offline-sync] cycle timeout ou erreur', e)
    } finally {
      setSyncing(false)
    }
  }, [refreshCount])

  useEffect(() => {
    refreshCount()
    if (online) runSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (online) runSync()
  }, [online, runSync])

  useEffect(() => {
    // 30s au lieu de 15s : les compteurs bougent rarement si l'user n'est pas
    // en train de generer des installs offline. Reduit la charge sur IDB.
    const interval = setInterval(refreshCount, 30_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  const clearAll = useCallback(async () => {
    await Promise.all([clearQueuedPhotos(), clearPendingInstalls()])
    setSyncing(false)
    await refreshCount()
  }, [refreshCount])

  return {
    pendingCount,
    pendingInstallCount,
    online,
    syncing,
    forceSync: runSync,
    clearAll,
  }
}
