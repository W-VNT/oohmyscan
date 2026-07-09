import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LocationFreePanel {
  id: string
  campaign_id: string
  operator_id: string
  location_id: string
  photo_path: string
  lat: number | null
  lng: number | null
  notes: string | null
  created_at: string
  campaign?: {
    id: string
    name: string
  } | null
  operator?: {
    id: string
    full_name: string | null
  } | null
}

/**
 * Charge les poses "panneau libre" faites sur un lieu specifique, toutes
 * campagnes confondues. Utile pour la fiche lieu admin (historique des
 * diffusions dans ce lieu).
 */
export function useLocationFreePanels(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-free-panels', locationId],
    queryFn: async (): Promise<LocationFreePanel[]> => {
      if (!locationId) return []
      const { data, error } = await supabase
        .from('campaign_free_panels')
        .select(`
          *,
          campaign:campaigns!campaign_free_panels_campaign_id_fkey(id, name),
          operator:profiles!campaign_free_panels_operator_id_fkey(id, full_name)
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as LocationFreePanel[]
    },
    enabled: !!locationId,
    staleTime: 30_000,
  })
}
