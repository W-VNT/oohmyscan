import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PanelType {
  id: string
  name: string
  width_cm: number | null
  height_cm: number | null
  description: string | null
  is_active: boolean
  created_at: string
}

/** Fetch all panel types (active + inactive for admin) */
export function usePanelTypes() {
  return useQuery({
    queryKey: ['panel-types'],
    queryFn: async (): Promise<PanelType[]> => {
      const { data, error } = await supabase
        .from('panel_formats')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

/** Fetch only active panel types (for operator selectors) */
export function useActivePanelTypes() {
  return useQuery({
    queryKey: ['panel-types', 'active'],
    queryFn: async (): Promise<PanelType[]> => {
      const { data, error } = await supabase
        .from('panel_formats')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreatePanelType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (panelType: { name: string; width_cm?: number; height_cm?: number; description?: string }) => {
      const { data, error } = await supabase
        .from('panel_formats')
        .insert(panelType)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-types'] })
    },
  })
}

/** Soft-delete: sets is_active = false */
export function useDeletePanelType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('panel_formats')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-types'] })
    },
  })
}

export function useUpdatePanelType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PanelType> & { id: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['panel-types'] })
    },
  })
}
