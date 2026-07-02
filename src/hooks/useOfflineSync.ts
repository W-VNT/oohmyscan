import { useEffect, useState, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { countQueuedPhotos } from '@/lib/offline-photo-queue'
import { processQueue } from '@/lib/photo-upload'

/**
 * Gère la sync automatique des photos en attente :
 *  - Au montage : compte les photos en queue et tente une sync si en ligne
 *  - Au passage online : déclenche processQueue()
 *  - Recompte périodiquement le badge (toutes les 15s)
 *
 * Retourne { pendingCount, online, syncing, forceSync } pour usage
 * dans les composants d'UI (banner, badge).
 */
export function useOfflineSync() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    try {
      const n = await countQueuedPhotos()
      setPendingCount(n)
    } catch {
      // IndexedDB pas dispo (navigation privée, etc.) — on ignore
      setPendingCount(0)
    }
  }, [])

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      await processQueue()
      await refreshCount()
    } finally {
      setSyncing(false)
    }
  }, [refreshCount])

  // Init : compte + sync si online
  useEffect(() => {
    refreshCount()
    if (online) runSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync automatique quand on repasse online
  useEffect(() => {
    if (online) runSync()
  }, [online, runSync])

  // Refresh périodique du compteur (indépendamment de la sync)
  useEffect(() => {
    const interval = setInterval(refreshCount, 15_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  return { pendingCount, online, syncing, forceSync: runSync }
}
