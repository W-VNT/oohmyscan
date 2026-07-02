import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DiffuseCampaign {
  id: string
  name: string
  start_date: string
  end_date: string | null
  status: string
  operator_user_ids: string[]
  clients: { company_name: string } | null
  /** true si tous les visuels sont sur des formats sans QR (dépôt) */
  isDepositCampaign: boolean
  /** Liste unique des formats utilisés */
  formats: { name: string; has_qr_code: boolean }[]
}

/**
 * Campagnes actives accessibles à l'opérateur courant.
 * Inclut :
 *  - Campagnes où auth.uid() ∈ operator_user_ids
 *  - Campagnes "ouvertes à tous" (operator_user_ids = '{}')
 */
export function useDiffuseCampaigns(userId: string | undefined) {
  return useQuery({
    queryKey: ['diffuse-campaigns', userId],
    queryFn: async (): Promise<DiffuseCampaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id, name, start_date, end_date, status, operator_user_ids,
          clients(company_name),
          campaign_visuals(panel_formats(name, has_qr_code))
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      if (error) throw error

      const all = (data ?? []) as unknown as Array<{
        id: string
        name: string
        start_date: string
        end_date: string | null
        status: string
        operator_user_ids: string[]
        clients: { company_name: string } | null
        campaign_visuals: Array<{
          panel_formats: { name: string; has_qr_code: boolean } | null
        }> | null
      }>

      // Filtre côté JS : SEUL les campagnes explicitement assignées à l'user.
      // Une campagne avec operator_user_ids vide = non assignée = invisible aux ops.
      const filtered = userId
        ? all.filter((c) => c.operator_user_ids?.includes(userId))
        : []

      return filtered.map((c) => {
        const allFormats = (c.campaign_visuals ?? [])
          .map((v) => v.panel_formats)
          .filter((f): f is { name: string; has_qr_code: boolean } => f !== null)
        // Dédup par nom
        const uniqFormats = Array.from(
          new Map(allFormats.map((f) => [f.name, f])).values(),
        )
        const isDepositCampaign =
          uniqFormats.length > 0 && uniqFormats.every((f) => !f.has_qr_code)
        return {
          id: c.id,
          name: c.name,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status,
          operator_user_ids: c.operator_user_ids ?? [],
          clients: c.clients,
          isDepositCampaign,
          formats: uniqFormats,
        }
      })
    },
    enabled: !!userId,
  })
}
