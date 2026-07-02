import { useEffect, useState } from 'react'

/**
 * Détecte le statut réseau en écoutant les events `online` / `offline`
 * du navigateur.
 *
 * Note : `navigator.onLine` n'est pas 100% fiable (peut retourner true
 * même si le wifi est connecté sans internet réel). Pour la détection
 * plus précise on pourrait ajouter un ping périodique vers Supabase,
 * mais ça consomme de la batterie donc on ne le fait pas par défaut.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
