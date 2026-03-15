import type { Database } from './database'
import type { PotentialSpot } from '@/lib/potential-search'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Panel = Tables<'panels'>
export type PanelPhoto = Tables<'panel_photos'>
export type Campaign = Tables<'campaigns'>
export type PanelCampaign = Tables<'panel_campaigns'>
export type Location = Tables<'locations'>
export type PanelContract = Tables<'panel_contracts'>
export type ContractAmendment = Tables<'contract_amendments'>
export type Quote = Tables<'quotes'>
export type QuoteLine = Tables<'quote_lines'>
export type Invoice = Tables<'invoices'>
export type InvoiceLine = Tables<'invoice_lines'>
export type QRStockItem = Tables<'qr_stock'>

// ---------------------------------------------------------------------------
// Joined / extended types used by hooks (avoids `as unknown as` double-casts)
// ---------------------------------------------------------------------------

/** Panel row with the joined `locations(name)` relation included by LIST_FIELDS */
export type PanelWithLocation = Panel & {
  locations: { name: string } | null
}

/** Quote row with the joined `clients(company_name)` relation */
export type QuoteWithClient = Quote & {
  clients: { company_name: string } | null
}

/** Invoice row with the joined `clients(company_name)` relation */
export type InvoiceWithClient = Invoice & {
  clients: { company_name: string } | null
}

/** Campaign row with the joined `clients(id, company_name)` relation */
export type CampaignWithClient = Campaign & {
  clients: { id: string; company_name: string } | null
}

/** QR stock item with the joined `panels(reference)` relation */
export type QRStockWithPanel = QRStockItem & {
  panels: { reference: string } | null
}

/**
 * PotentialRequest with `potential_spots` narrowed from `unknown` to `PotentialSpot[]`.
 * The DB column is typed as `jsonb` (→ `unknown`), but we always store a typed array.
 */
export type PotentialRequest = Omit<Tables<'potential_requests'>, 'potential_spots'> & {
  potential_spots: PotentialSpot[]
}

/** Campaign row with only the client join used by dashboard stats */
export type CampaignWithClientName = {
  id: string
  name: string
  status: string
  end_date: string
  client_id: string | null
  clients: { company_name: string } | null
}

/** Panel photo row with joined panels + profiles (dashboard recent activity) */
export type PhotoWithJoins = {
  id: string
  photo_type: string
  taken_at: string
  panels: { id: string; name: string | null; reference: string } | null
  profiles: { full_name: string } | null
}

/** Panel campaign row with joined panels + campaigns + profiles (dashboard recent activity) */
export type AssignmentWithJoins = {
  id: string
  assigned_at: string
  panels: { id: string; name: string | null; reference: string } | null
  campaigns: { name: string } | null
  profiles: { full_name: string } | null
}
