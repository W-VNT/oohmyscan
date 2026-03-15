import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PotentialRequest } from '@/types'

export type { PotentialRequest }

export function usePotentialRequests() {
  return useQuery({
    queryKey: ['potential-requests'],
    queryFn: async (): Promise<PotentialRequest[]> => {
      const { data, error } = await supabase
        .from('potential_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PotentialRequest[]
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
      return data as PotentialRequest
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
      return data as PotentialRequest
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
      return data as PotentialRequest
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
