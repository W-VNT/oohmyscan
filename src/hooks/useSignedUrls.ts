import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Liens temporaires signes pour des fichiers d'un bucket prive, generes par
 * lot (une seule requete). Renvoie une Map chemin -> URL signee.
 * Les URLs sont reutilisees jusqu'a 10 min avant leur expiration.
 */
export function useSignedUrls(bucket: string, paths: Array<string | null | undefined>, expiresIn = 3600) {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p))).sort()

  return useQuery({
    queryKey: ['signed-urls', bucket, unique],
    queryFn: async () => {
      const map = new Map<string, string>()
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn)
      if (error) throw error
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
      }
      return map
    },
    enabled: unique.length > 0,
    staleTime: (expiresIn - 600) * 1000,
  })
}
