import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CampaignDeposit {
  id: string
  campaign_id: string
  operator_id: string
  quantity: number
  photo_path: string
  place_id: string | null
  place_name: string
  place_address: string | null
  lat: number | null
  lng: number | null
  notes: string | null
  created_at: string
  // Joined
  operator?: { full_name: string | null } | null
}

export function useCampaignDeposits(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-deposits', campaignId],
    queryFn: async (): Promise<CampaignDeposit[]> => {
      const { data, error } = await supabase
        .from('campaign_deposits')
        .select('*, operator:profiles!operator_id(full_name)')
        .eq('campaign_id', campaignId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignDeposit[]
    },
    enabled: !!campaignId,
  })
}
