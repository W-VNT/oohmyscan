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
  invoice_number: string
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

export function usePublicDocument(token: string | undefined) {
  return useQuery({
    queryKey: ['public-document', token],
    queryFn: async (): Promise<PublicDocument | null> => {
      if (!token) return null

      // Try quote first
      const { data: quote } = await supabase
        .from('quotes')
        .select('id, quote_number, issued_at, valid_until, status, total_ht, total_ttc, notes, client_reference')
        .eq('public_token', token)
        .maybeSingle()

      if (quote) return { type: 'quote', data: quote as PublicQuote }

      // Try invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, invoice_number, issued_at, due_at, status, invoice_type, total_ht, total_ttc, notes, client_reference')
        .eq('public_token', token)
        .maybeSingle()

      if (invoice) return { type: 'invoice', data: invoice as PublicInvoice }

      return null
    },
    enabled: !!token,
  })
}
