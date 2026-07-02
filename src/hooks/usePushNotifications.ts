import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Convertit une base64 URL-safe en Uint8Array pour applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

/**
 * Gère l'inscription au Web Push :
 *  - État : permission navigateur + subscription active (côté SW)
 *  - subscribe() : demande permission + crée subscription + save en DB
 *  - unsubscribe() : supprime la subscription locale + DB
 */
export function usePushNotifications() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof Notification === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator))
      return 'unsupported'
    return Notification.permission as PermissionState
  })
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supported = permission !== 'unsupported' && !!VAPID_PUBLIC_KEY

  const refreshSubscribed = useCallback(async () => {
    if (!supported) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {
      setSubscribed(false)
    }
  }, [supported])

  useEffect(() => {
    refreshSubscribed()
  }, [refreshSubscribed])

  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Push notifications non supportées sur ce navigateur / cette PWA')
      return false
    }
    if (!VAPID_PUBLIC_KEY) {
      setError('Clé VAPID publique manquante (VITE_VAPID_PUBLIC_KEY)')
      return false
    }
    if (!userId) {
      setError('Non connecté')
      return false
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Demande permission
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)
      if (perm !== 'granted') {
        setError('Permission refusée')
        return false
      }

      // 2. Crée la subscription côté SW
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast : ambigüité SharedArrayBuffer vs ArrayBuffer selon la lib DOM
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      // 3. Extract endpoint + keys pour save en DB
      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError('Subscription invalide')
        return false
      }

      // 4. Upsert en DB (unique par endpoint)
      const { error: dbErr } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      )
      if (dbErr) throw dbErr

      setSubscribed(true)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      return false
    } finally {
      setLoading(false)
    }
  }, [supported, userId])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setSubscribed(false)
        return
      }
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      // Supprime en DB
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      setSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [supported])

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
  }
}
