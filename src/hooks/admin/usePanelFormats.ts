import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PanelFormat {
  id: string
  name: string
  width_cm: number | null
  height_cm: number | null
  description: string | null
  is_active: boolean
  created_at: string
}

export function usePanelFormats() {
  return useQuery({
    queryKey: ['panel-formats'],
    queryFn: async (): Promise<PanelFormat[]> => {
      const { data, error } = await supabase
        .from('panel_formats')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreatePanelFormat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (format: { name: string; width_cm?: number; height_cm?: number; description?: string }) => {
      const { data, error } = await supabase
        .from('panel_formats')
        .insert(format)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-formats'] })
    },
  })
}

export function useUpdatePanelFormat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PanelFormat> & { id: string }) => {
      const { data, error } = await supabase
        .from('panel_formats')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-formats'] })
    },
  })
}
