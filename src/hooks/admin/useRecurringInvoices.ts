import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RecurringTemplateLine {
  description: string
  quantity: number
  unit: string
  unit_price: number
  tva_rate: number
  discount_type: 'percent' | 'amount' | null
  discount_value: number
}

export interface RecurringInvoice {
  id: string
  client_id: string
  campaign_id: string | null
  frequency: 'monthly' | 'quarterly' | 'yearly'
  next_issue_date: string
  template_lines: RecurringTemplateLine[]
  payment_terms: string
  notes: string | null
  currency: string
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface RecurringInvoiceWithClient extends RecurringInvoice {
  clients: { company_name: string } | null
}

export function useRecurringInvoices() {
  return useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: async (): Promise<RecurringInvoiceWithClient[]> => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*, clients(company_name)')
        .order('next_issue_date')
      if (error) throw error
      return data as unknown as RecurringInvoiceWithClient[]
    },
  })
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rec: Omit<RecurringInvoice, 'id' | 'created_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert(rec)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] })
    },
  })
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] })
    },
  })
}

export function useDeleteRecurringInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] })
    },
  })
}

export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  yearly: 'Annuelle',
}
