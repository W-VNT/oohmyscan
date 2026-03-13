import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface QRStockItem {
  id: string
  uuid_code: string
  is_assigned: boolean
  panel_id: string | null
  generated_at: string
  assigned_at: string | null
}

export type QRStockWithPanel = QRStockItem & { panels: { reference: string } | null }

export function useQRStock() {
  return useQuery({
    queryKey: ['qr-stock'],
    queryFn: async (): Promise<QRStockWithPanel[]> => {
      const { data, error } = await supabase
        .from('qr_stock')
        .select('*, panels(reference)')
        .order('generated_at', { ascending: false })
      if (error) throw error
      return data as unknown as QRStockWithPanel[]
    },
  })
}

export function useQRStockStats() {
  return useQuery({
    queryKey: ['qr-stock', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_stock')
        .select('is_assigned')
      if (error) throw error
      const total = data.length
      const assigned = data.filter((d) => d.is_assigned).length
      return { total, assigned, available: total - assigned }
    },
  })
}

export function useDeleteQRCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('qr_stock')
        .delete()
        .in('id', ids)
        .eq('is_assigned', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-stock'] })
    },
  })
}

export function useGenerateQRCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (count: number) => {
      const items = Array.from({ length: count }, () => ({
        uuid_code: crypto.randomUUID(),
      }))
      const { data, error } = await supabase
        .from('qr_stock')
        .insert(items)
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-stock'] })
    },
  })
}
