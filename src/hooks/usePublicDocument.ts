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

// Validate UUID format to prevent junk queries
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function usePublicDocument(token: string | undefined) {
  return useQuery({
    queryKey: ['public-document', token],
    queryFn: async (): Promise<PublicDocument | null> => {
      if (!token || !UUID_REGEX.test(token)) return null

      const now = new Date().toISOString()

      type WithExpiry<T> = T & { public_token_expires_at?: string | null }

      // Try quote first — check token not expired
      const { data: rawQuote } = await supabase
        .from('quotes')
        .select('id, quote_number, issued_at, valid_until, status, total_ht, total_ttc, notes, client_reference')
        .eq('public_token', token)
        .maybeSingle()
      const quote = rawQuote as WithExpiry<typeof rawQuote> | null

      if (quote) {
        if (quote.public_token_expires_at && quote.public_token_expires_at < now) return null
        return { type: 'quote', data: quote as unknown as PublicQuote }
      }

      // Try invoice — check token not expired
      const { data: rawInvoice } = await supabase
        .from('invoices')
        .select('id, invoice_number, issued_at, due_at, status, invoice_type, total_ht, total_ttc, notes, client_reference')
        .eq('public_token', token)
        .maybeSingle()
      const invoice = rawInvoice as WithExpiry<typeof rawInvoice> | null

      if (invoice) {
        if (invoice.public_token_expires_at && invoice.public_token_expires_at < now) return null
        return { type: 'invoice', data: invoice as unknown as PublicInvoice }
      }

      return null
    },
    enabled: !!token && UUID_REGEX.test(token),
    staleTime: 5 * 60 * 1000, // Cache 5 min to limit repeated queries
    retry: false, // Don't retry on 404
  })
}
