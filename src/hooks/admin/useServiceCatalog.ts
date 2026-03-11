import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ServiceCatalogItem {
  id: string
  name: string
  default_unit_price: number
  default_tva_rate: number
  unit: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export function useServiceCatalog() {
  return useQuery({
    queryKey: ['service-catalog'],
    queryFn: async (): Promise<ServiceCatalogItem[]> => {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateServiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: { name: string; default_unit_price?: number; default_tva_rate?: number; unit?: string }) => {
      const { data, error } = await supabase
        .from('service_catalog')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] })
    },
  })
}

export function useUpdateServiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] })
    },
  })
}
