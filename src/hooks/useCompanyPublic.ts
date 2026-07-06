import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CompanyPublic {
  id: string
  company_name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  siret: string | null
  tva_number: string | null
  phone: string | null
  email: string | null
  logo_path: string | null
  legal_mentions: string | null
  late_penalty_text: string | null
  default_panel_type_id: string | null
  email_contract_subject: string | null
  email_contract_body: string | null
}

/**
 * Lecture des parametres entreprise "publics" (sans IBAN/BIC/cles API).
 * Utilise par les operateurs pour la generation des PDF contrats,
 * car company_settings est admin-only en RLS.
 */
export function useCompanyPublic() {
  return useQuery({
    queryKey: ['company-public'],
    queryFn: async (): Promise<CompanyPublic | null> => {
      const { data, error } = await supabase
        .rpc('get_company_public')
        .maybeSingle()
      if (error) throw error
      return data as unknown as CompanyPublic | null
    },
  })
}
