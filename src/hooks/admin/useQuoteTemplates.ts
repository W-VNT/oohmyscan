import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TemplateLine {
  description: string
  quantity: number
  unit: string
  unit_price: number
  tva_rate: number
  discount_type: 'percent' | 'amount' | null
  discount_value: number
}

export interface QuoteTemplate {
  id: string
  name: string
  lines: TemplateLine[]
  notes: string | null
  created_by: string | null
  created_at: string
}

export function useQuoteTemplates() {
  return useQuery({
    queryKey: ['quote-templates'],
    queryFn: async (): Promise<QuoteTemplate[]> => {
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .order('name')
      if (error) throw error
      return data as unknown as QuoteTemplate[]
    },
  })
}

export function useCreateQuoteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (template: { name: string; lines: TemplateLine[]; notes?: string | null }) => {
      const { data, error } = await supabase
        .from('quote_templates')
        .insert(template)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] })
    },
  })
}

export function useDeleteQuoteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] })
    },
  })
}
