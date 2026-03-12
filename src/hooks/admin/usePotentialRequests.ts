import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PotentialSpot } from '@/lib/potential-search'

export interface PotentialRequest {
  id: string
  reference: string
  prospect_name: string
  city: string
  radius_km: number
  lat: number | null
  lng: number | null
  existing_panels_count: number
  potential_spots_count: number
  existing_panel_ids: string[]
  potential_spots: PotentialSpot[]
  status: 'draft' | 'sent'
  created_by: string | null
  created_at: string
}

export function usePotentialRequests() {
  return useQuery({
    queryKey: ['potential-requests'],
    queryFn: async (): Promise<PotentialRequest[]> => {
      const { data, error } = await supabase
        .from('potential_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as PotentialRequest[]
    },
  })
}

export function usePotentialRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['potential-requests', id],
    queryFn: async (): Promise<PotentialRequest> => {
      const { data, error } = await supabase
        .from('potential_requests')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as PotentialRequest
    },
    enabled: !!id,
  })
}

export function useCreatePotentialRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      req: Omit<PotentialRequest, 'id' | 'created_at' | 'created_by'>,
    ) => {
      const { data, error } = await supabase
        .from('potential_requests')
        .insert(req)
        .select()
        .single()
      if (error) throw error
      return data as unknown as PotentialRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potential-requests'] })
    },
  })
}

export function useUpdatePotentialRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PotentialRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('potential_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as unknown as PotentialRequest
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['potential-requests'] })
      queryClient.invalidateQueries({ queryKey: ['potential-requests', data.id] })
    },
  })
}

/** Fetch the next potential reference number via the SQL function */
export async function getNextPotentialNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_potential_number')
  if (error) throw error
  return data as string
}
