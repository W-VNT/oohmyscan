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
 * Campagnes actives assignees a l'operateur.
 * Split en 2 queries pour la perf :
 *   1) Fetch les campagnes filtrees (rapide, pas de join)
 *   2) Fetch les formats des visuels de ces campagnes en une seule query,
 *      puis rassemble en memoire pour deriver isDepositCampaign.
 * Beaucoup plus rapide que le nested SELECT precedent qui deployait
 * campaign_visuals -> panel_formats sur chaque row.
 */
export function useDiffuseCampaigns(userId: string | undefined) {
  return useQuery({
    queryKey: ['diffuse-campaigns', userId],
    queryFn: async (): Promise<DiffuseCampaign[]> => {
      if (!userId) return []

      // 1. Campagnes actives explicitement assignees a l'operateur
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, name, start_date, end_date, status, operator_user_ids, clients(company_name)')
        .eq('status', 'active')
        .contains('operator_user_ids', [userId])
        .order('start_date', { ascending: false })
      if (error) throw error

      const rows = (campaigns ?? []) as unknown as Array<{
        id: string
        name: string
        start_date: string
        end_date: string | null
        status: string
        operator_user_ids: string[]
        clients: { company_name: string } | null
      }>

      if (rows.length === 0) return []

      // 2. Recupere en une seule query les formats des visuels de ces campagnes
      const campaignIds = rows.map((c) => c.id)
      const { data: visuals } = await supabase
        .from('campaign_visuals')
        .select('campaign_id, panel_formats(name, has_qr_code)')
        .in('campaign_id', campaignIds)

      // Regroupe par campaign_id
      const formatsByCampaign = new Map<string, { name: string; has_qr_code: boolean }[]>()
      for (const v of (visuals ?? []) as unknown as Array<{
        campaign_id: string
        panel_formats: { name: string; has_qr_code: boolean } | null
      }>) {
        if (!v.panel_formats) continue
        const arr = formatsByCampaign.get(v.campaign_id) ?? []
        // Dedup par nom
        if (!arr.some((f) => f.name === v.panel_formats!.name)) {
          arr.push(v.panel_formats)
        }
        formatsByCampaign.set(v.campaign_id, arr)
      }

      return rows.map((c) => {
        const uniqFormats = formatsByCampaign.get(c.id) ?? []
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
    staleTime: 30_000,
  })
}
