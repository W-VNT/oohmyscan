import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Quote, QuoteLine, QuoteWithClient } from '@/types'

export type { Quote, QuoteLine, QuoteWithClient }

export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: async (): Promise<QuoteWithClient[]> => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as QuoteWithClient[]
    },
  })
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async (): Promise<QuoteWithClient> => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(company_name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as QuoteWithClient
    },
    enabled: !!id,
  })
}

export function useQuoteLines(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote-lines', quoteId],
    queryFn: async (): Promise<QuoteLine[]> => {
      const { data, error } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quoteId!)
        .order('sort_order')
      if (error) throw error
      return data as QuoteLine[]
    },
    enabled: !!quoteId,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'total_ht' | 'total_tva' | 'total_ttc'>) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

export function useUpdateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quote> & { id: string }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quotes', data.id] })
    },
  })
}

export function useSaveQuoteLines() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ quoteId, lines }: { quoteId: string; lines: Omit<QuoteLine, 'id'>[] }) => {
      const totalHt = lines.reduce((sum, l) => sum + l.total_ht, 0)
      const totalTva = lines.reduce((sum, l) => sum + l.total_ht * (l.tva_rate / 100), 0)

      const { error } = await supabase.rpc('save_quote_lines', {
        p_quote_id: quoteId,
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
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quotes', quoteId] })
      queryClient.invalidateQueries({ queryKey: ['quote-lines', quoteId] })
    },
  })
}
