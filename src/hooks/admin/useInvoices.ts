import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceLine, InvoiceWithClient } from '@/types'

export type { Invoice, InvoiceLine, InvoiceWithClient }

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<InvoiceWithClient[]> => {
      // Auto-mark overdue: sent invoices past due date
      await supabase
        .from('invoices')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('status', 'sent')
        .lt('due_at', new Date().toISOString().split('T')[0])

      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients!invoices_client_id_fkey(company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as InvoiceWithClient[]
    },
  })
}

const PAGE_SIZE = 25

export function usePaginatedInvoices(
  page: number,
  search: string,
  status: string,
  sort: string,
  showArchived: boolean,
) {
  return useQuery({
    queryKey: ['invoices', 'paginated', page, search, status, sort, showArchived],
    queryFn: async () => {
      // Auto-mark overdue
      await supabase
        .from('invoices')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('status', 'sent')
        .lt('due_at', new Date().toISOString().split('T')[0])

      let query = supabase
        .from('invoices')
        .select('*, clients!invoices_client_id_fkey(company_name)', { count: 'exact' })

      if (!showArchived) query = query.eq('is_archived', false)
      if (status && status !== 'all') query = query.eq('status', status as 'draft')
      if (search.trim()) {
        const q = `%${search.trim()}%`
        query = query.or(`invoice_number.ilike.${q}`)
      }

      switch (sort) {
        case 'oldest': query = query.order('issued_at', { ascending: true }); break
        case 'due_date': query = query.order('due_at', { ascending: true }); break
        case 'amount_desc': query = query.order('total_ttc', { ascending: false }); break
        case 'amount_asc': query = query.order('total_ttc', { ascending: true }); break
        case 'number': query = query.order('invoice_number', { ascending: true }); break
        default: query = query.order('created_at', { ascending: false }); break
      }

      const from = page * PAGE_SIZE
      query = query.range(from, from + PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { invoices: data as unknown as InvoiceWithClient[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async (): Promise<InvoiceWithClient> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients!invoices_client_id_fkey(company_name)')
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
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'total_ht' | 'total_tva' | 'total_ttc' | 'is_archived' | 'include_terms' | 'currency' | 'custom_fields' | 'public_token'>) => {
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

/** Fetch deposit (acompte) invoices for a given campaign — used to compute balance for solde invoices */
export function useCampaignDepositInvoices(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-deposit-invoices', campaignId],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('invoice_type', 'acompte')
        .neq('status', 'cancelled')
        .order('created_at')
      if (error) throw error
      return data as Invoice[]
    },
    enabled: !!campaignId,
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
