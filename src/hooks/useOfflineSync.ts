import { useEffect, useState, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { countQueuedPhotos } from '@/lib/offline-photo-queue'
import { processQueue } from '@/lib/photo-upload'
import {
  countPendingInstalls,
  listPendingInstalls,
  removePendingInstall,
  updatePendingInstall,
} from '@/lib/offline-mutation-queue'
import { performInstallSave } from '@/lib/install-replay'
import { toast } from '@/components/shared/Toast'

const MAX_INSTALL_ATTEMPTS = 5

/**
 * Rejoue toutes les installations en attente dans la queue mutation IDB.
 * Chaque install est rejouée via performInstallSave() — la fonction est
 * idempotente (matches panels par qr_code) donc un retry après un succès
 * partiel ne double pas les inserts.
 */
async function processInstallQueue(): Promise<{ replayed: number; remaining: number; failed: number }> {
  if (!navigator.onLine) {
    return { replayed: 0, remaining: (await listPendingInstalls()).length, failed: 0 }
  }
  const queue = await listPendingInstalls()
  let replayed = 0
  let failed = 0
  for (const item of queue) {
    if (item.attempts >= MAX_INSTALL_ATTEMPTS) {
      failed++
      continue
    }
    try {
      await performInstallSave(item.payload)
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
    setSyncing(true)
    try {
      // Photos d'abord (car les installs referencent des paths de photos)
      await processQueue()
      const res = await processInstallQueue()
      if (res.replayed > 0) {
        toast(`${res.replayed} installation${res.replayed > 1 ? 's' : ''} synchronisée${res.replayed > 1 ? 's' : ''}`)
      }
      await refreshCount()
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
    const interval = setInterval(refreshCount, 15_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  return {
    pendingCount,
    pendingInstallCount,
    online,
    syncing,
    forceSync: runSync,
  }
}
