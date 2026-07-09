import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CampaignFreePanel {
  id: string
  campaign_id: string
  operator_id: string
  location_id: string
  photo_path: string
  lat: number | null
  lng: number | null
  notes: string | null
  created_at: string
  location?: {
    id: string
    name: string
    address: string | null
    city: string | null
    postal_code: string | null
  } | null
  operator?: {
    id: string
    full_name: string | null
  } | null
}

/**
 * Charge les poses "panneau libre" d'une campagne, avec le lieu associe
 * (locations) et l'operateur (profiles) pour affichage direct.
 */
export function useCampaignFreePanels(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-free-panels', campaignId],
    queryFn: async (): Promise<CampaignFreePanel[]> => {
      if (!campaignId) return []
      const { data, error } = await supabase
        .from('campaign_free_panels')
        .select(`
          *,
          location:locations!campaign_free_panels_location_id_fkey(id, name, address, city, postal_code),
          operator:profiles!campaign_free_panels_operator_id_fkey(id, full_name)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as CampaignFreePanel[]
    },
    enabled: !!campaignId,
    staleTime: 30_000,
  })
}
