import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QRStockItem, QRStockWithPanel } from '@/types'

export type { QRStockItem, QRStockWithPanel }

export function useQRStock() {
  return useQuery({
    queryKey: ['qr-stock'],
    queryFn: async (): Promise<QRStockWithPanel[]> => {
      // Supabase cap par defaut a 1000 rows. On monte le range a 10000 pour
      // supporter un plus gros stock. Au dela, il faudra paginer server-side.
      const { data, error } = await supabase
        .from('qr_stock')
        .select('*, panels(reference)')
        .order('generated_at', { ascending: false })
        .range(0, 9999)
      if (error) throw error
      return data as unknown as QRStockWithPanel[]
    },
  })
}

export function useQRStockStats() {
  return useQuery({
    queryKey: ['qr-stock', 'stats'],
    queryFn: async () => {
      // 2 count-only queries au lieu de fetch toutes les rows.
      // count:'exact' + head:true : Postgres retourne juste le count,
      // pas les donnees. Ultra-rapide meme sur des tres gros datasets.
      const [totalRes, assignedRes] = await Promise.all([
        supabase.from('qr_stock').select('*', { count: 'exact', head: true }),
        supabase.from('qr_stock').select('*', { count: 'exact', head: true }).eq('is_assigned', true),
      ])
      if (totalRes.error) throw totalRes.error
      if (assignedRes.error) throw assignedRes.error
      const total = totalRes.count ?? 0
      const assigned = assignedRes.count ?? 0
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
