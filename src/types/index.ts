import type { Database } from './database'

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
