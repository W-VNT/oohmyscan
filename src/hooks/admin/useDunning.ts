import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DunningEntry {
  id: string
  invoice_id: string
  level: number
  sent_at: string
  method: 'email' | 'manual'
  notes: string | null
  created_by: string | null
}

export const DUNNING_LEVELS: Record<number, { label: string; tone: string }> = {
  1: { label: 'Relance courtoise', tone: 'text-yellow-600' },
  2: { label: 'Relance ferme', tone: 'text-orange-600' },
  3: { label: 'Mise en demeure', tone: 'text-red-600' },
}

export function useInvoiceDunning(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['dunning', invoiceId],
    queryFn: async (): Promise<DunningEntry[]> => {
      const { data, error } = await supabase
        .from('dunning_history')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sent_at', { ascending: false })
      if (error) throw error
      return data as DunningEntry[]
    },
    enabled: !!invoiceId,
  })
}

export function useCreateDunningEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: { invoice_id: string; level: number; method?: 'email' | 'manual'; notes?: string }) => {
      const { data, error } = await supabase
        .from('dunning_history')
        .insert(entry)
        .select()
        .single()
      if (error) throw error
      return data as DunningEntry
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dunning', data.invoice_id] })
    },
  })
}
