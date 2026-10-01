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
  terms_and_conditions_pdf_path: string | null
  resend_api_key: string | null
  email_from: string | null
  email_from_name: string | null
  email_quote_subject: string | null
  email_quote_body: string | null
  email_invoice_subject: string | null
  email_invoice_body: string | null
  email_contract_subject: string | null
  email_contract_body: string | null
  // Defaults rapport campagne (cf table company_settings)
  default_report_intro_text: string | null
  default_brand_color: string | null
  report_linkedin_url: string | null
  report_website_url: string | null
}

/**
 * Fetches all company_settings fields including sensitive financial data (IBAN, BIC).
 * All current consumers (SettingsPage, QuoteDetailPage, InvoiceDetailPage, ContractStepper,
 * PotentialNewPage) need the full row. If a lightweight consumer is added later,
 * create a separate hook with an explicit column list excluding iban/bic.
 */
export function useCompanySettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single()
      if (error) throw error
      return data as unknown as CompanySettings
    },
    enabled: options.enabled ?? true,
  })
}

/** Champs societe imprimes sur les documents (sans cles API ni modeles email). */
export type DocumentCompanySettings = Pick<
  CompanySettings,
  | 'id' | 'company_name' | 'address' | 'city' | 'postal_code' | 'siret' | 'tva_number'
  | 'logo_path' | 'email' | 'phone' | 'iban' | 'bic' | 'quote_prefix' | 'legal_mentions'
  | 'late_penalty_text' | 'terms_and_conditions' | 'terms_and_conditions_pdf_path'
>

/** Version commerciale : passe par une RPC, company_settings etant admin-only. */
export function useDocumentCompanySettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['company-document-settings'],
    queryFn: async (): Promise<DocumentCompanySettings> => {
      const { data, error } = await supabase.rpc('get_company_document_settings').single()
      if (error) throw error
      return data as DocumentCompanySettings
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000,
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
