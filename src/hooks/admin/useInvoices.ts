import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Invoice {
  id: string
  invoice_number: string
  quote_id: string | null
  client_id: string
  campaign_id: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issued_at: string
  due_at: string
  paid_at: string | null
  notes: string | null
  total_ht: number
  total_tva: number
  total_ttc: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tva_rate: number
  total_ht: number
  sort_order: number
}

export type InvoiceWithClient = Invoice & { clients: { company_name: string } | null }

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<InvoiceWithClient[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as InvoiceWithClient[]
    },
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async (): Promise<InvoiceWithClient> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(company_name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as InvoiceWithClient
    },
    enabled: !!id,
  })
}

export function useInvoiceLines(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-lines', invoiceId],
    queryFn: async (): Promise<InvoiceLine[]> => {
      const { data, error } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order')
      if (error) throw error
      return data as InvoiceLine[]
    },
    enabled: !!invoiceId,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'total_ht' | 'total_tva' | 'total_ttc'>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', data.id] })
    },
  })
}

export function useSaveInvoiceLines() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, lines }: { invoiceId: string; lines: Omit<InvoiceLine, 'id'>[] }) => {
      const totalHt = lines.reduce((sum, l) => sum + l.total_ht, 0)
      const totalTva = lines.reduce((sum, l) => sum + l.total_ht * (l.tva_rate / 100), 0)

      const { error } = await supabase.rpc('save_invoice_lines', {
        p_invoice_id: invoiceId,
        p_lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          tva_rate: l.tva_rate,
          total_ht: l.total_ht,
          sort_order: l.sort_order,
        })),
        p_total_ht: Math.round(totalHt * 100) / 100,
        p_total_tva: Math.round(totalTva * 100) / 100,
        p_total_ttc: Math.round((totalHt + totalTva) * 100) / 100,
      })
      if (error) throw error
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice-lines', invoiceId] })
    },
  })
}
