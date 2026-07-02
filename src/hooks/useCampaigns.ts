import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campaign, CampaignWithClient, InsertTables } from '@/types'

export type { CampaignWithClient }

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<CampaignWithClient[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignWithClient[]
    },
  })
}

/**
 * Campagnes actives.
 * Si `assignedToUserId` est passé, filtre uniquement celles où
 * l'user est explicitement dans operator_user_ids (utilisé côté opérateur).
 * Sans argument = toutes (côté admin).
 */
export function useActiveCampaigns(assignedToUserId?: string) {
  return useQuery({
    queryKey: ['campaigns', 'active', assignedToUserId ?? 'all'],
    queryFn: async (): Promise<CampaignWithClient[]> => {
      let query = supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      if (assignedToUserId) {
        query = query.contains('operator_user_ids', [assignedToUserId])
      }
      const { data, error } = await query
      if (error) throw error
      return data as unknown as CampaignWithClient[]
    },
  })
}

export function useClientCampaigns(clientId: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', 'client', clientId],
    queryFn: async (): Promise<CampaignWithClient[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .eq('client_id', clientId!)
        .in('status', ['draft', 'active', 'cancelled'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignWithClient[]
    },
    enabled: !!clientId,
  })
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async (): Promise<CampaignWithClient> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, company_name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as CampaignWithClient
    },
    enabled: !!id,
  })
}

/**
 * Hard delete d'une campagne + données liées.
 * - campaign_visuals, campaign_reports, campaign_deposits : cascade SQL auto
 * - panel_campaigns : suppression manuelle (pas de cascade en DB)
 * - quotes/invoices/recurring_invoices : dé-liaison (campaign_id → NULL)
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Dé-lie les documents financiers (on garde les factures/devis)
      await Promise.all([
        supabase.from('quotes').update({ campaign_id: null }).eq('campaign_id', id),
        supabase.from('invoices').update({ campaign_id: null }).eq('campaign_id', id),
        supabase.from('recurring_invoices').update({ campaign_id: null }).eq('campaign_id', id),
      ])
      // 2. Supprime les assignations panneaux (pas de cascade)
      await supabase.from('panel_campaigns').delete().eq('campaign_id', id)
      // 3. Supprime la campagne (cascade sur visuals, reports, deposits)
      const { error } = await supabase.from('campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaign: InsertTables<'campaigns'>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useAssignCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assignment: InsertTables<'panel_campaigns'>) => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .insert(assignment)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['panel-assignments', variables.panel_id] })
      queryClient.invalidateQueries({ queryKey: ['campaign-visual'] })
      queryClient.invalidateQueries({ queryKey: ['panel-photos', variables.panel_id] })
    },
  })
}
