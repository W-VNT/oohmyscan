import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campaign, InsertTables } from '@/types'

export type CampaignWithClient = Campaign & {
  clients: { id: string; company_name: string } | null
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<CampaignWithClient[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignWithClient[]
    },
  })
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async (): Promise<CampaignWithClient[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignWithClient[]
    },
  })
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async (): Promise<CampaignWithClient> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as CampaignWithClient
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaign: InsertTables<'campaigns'>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useAssignCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assignment: InsertTables<'panel_campaigns'>) => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .insert(assignment)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['panel-assignments', variables.panel_id] })
      queryClient.invalidateQueries({ queryKey: ['campaign-visual'] })
      queryClient.invalidateQueries({ queryKey: ['panel-photos', variables.panel_id] })
    },
  })
}
