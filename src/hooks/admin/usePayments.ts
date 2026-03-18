import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
}

export const PAYMENT_METHOD_LABELS: Record<Payment['payment_method'], string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  cb: 'Carte bancaire',
  prelevement: 'Prélèvement',
  autre: 'Autre',
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!invoiceId,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single()
      if (error) throw error
      return data as Payment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', data.invoice_id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', data.invoice_id] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { invoiceId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', data.invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', data.invoiceId] })
    },
  })
}
