import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QRStockItem, QRStockWithPanel } from '@/types'

export type { QRStockItem, QRStockWithPanel }

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
      const items = data as Pick<QRStockItem, 'is_assigned'>[]
      const total = items.length
      const assigned = items.filter((d) => d.is_assigned).length
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
