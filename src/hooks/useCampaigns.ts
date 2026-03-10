import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campaign, InsertTables } from '@/types'

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async (): Promise<Campaign> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
