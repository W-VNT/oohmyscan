import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface PublicQuote {
  id: string
  quote_number: string
  issued_at: string
  valid_until: string
  status: string
  total_ht: number
  total_ttc: number
  notes: string | null
  client_reference: string | null
}

interface PublicInvoice {
  id: string
  invoice_number: string | null
  issued_at: string
  due_at: string
  status: string
  invoice_type: string
  total_ht: number
  total_ttc: number
  notes: string | null
  client_reference: string | null
}

export type PublicDocument =
  | { type: 'quote'; data: PublicQuote }
  | { type: 'invoice'; data: PublicInvoice }

// Validate UUID format to prevent junk queries
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function usePublicDocument(token: string | undefined) {
  return useQuery({
    queryKey: ['public-document', token],
    queryFn: async (): Promise<PublicDocument | null> => {
      if (!token || !UUID_REGEX.test(token)) return null

      // RPC SECURITY DEFINER : renvoie uniquement le document du jeton (et
      // verifie l'expiration cote DB). Les tables quotes/invoices ne sont
      // plus lisibles en anon.
      const { data, error } = await supabase.rpc('get_public_document', { p_token: token })
      if (error) throw error
      return (data as unknown as PublicDocument | null) ?? null
    },
    enabled: !!token && UUID_REGEX.test(token),
    staleTime: 5 * 60 * 1000, // Cache 5 min to limit repeated queries
    retry: false, // Don't retry on 404
  })
}
