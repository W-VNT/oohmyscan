import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CompanySettings {
  id: string
  company_name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  siret: string | null
  tva_number: string | null
  logo_path: string | null
  email: string | null
  phone: string | null
  iban: string | null
  bic: string | null
  quote_prefix: string
  invoice_prefix: string
  next_quote_number: number
  next_invoice_number: number
  potential_prefix: string
  next_potential_number: number
  legal_mentions: string | null
  default_panel_type_id: string | null
  late_penalty_text: string | null
  terms_and_conditions: string | null
}

/**
 * Fetches all company_settings fields including sensitive financial data (IBAN, BIC).
 * All current consumers (SettingsPage, QuoteDetailPage, InvoiceDetailPage, ContractStepper,
 * PotentialNewPage) need the full row. If a lightweight consumer is added later,
 * create a separate hook with an explicit column list excluding iban/bic.
 */
export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      const { data: current } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single()
      if (!current) throw new Error('No company settings found')

      const { data, error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
  })
}
