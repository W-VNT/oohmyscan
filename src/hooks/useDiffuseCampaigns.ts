import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type CampaignWorkflow = 'qr' | 'deposit' | 'free_panel' | 'mixed'

export interface DiffuseCampaign {
  id: string
  name: string
  start_date: string
  end_date: string | null
  status: string
  operator_user_ids: string[]
  clients: { company_name: string } | null
  /** true si tous les visuels sont sur des formats sans QR (dépôt sous-bock) */
  isDepositCampaign: boolean
  /** Workflow opérateur derive des formats des visuels. Si tous les visuels
   *  sont sur un meme workflow_type -> ce type. Sinon 'mixed' (rare, admin
   *  a mixe des formats incompatibles).  */
  workflow: CampaignWorkflow
  /** Liste unique des formats utilisés */
  formats: { name: string; has_qr_code: boolean; workflow_type: 'qr' | 'deposit' | 'free_panel' }[]
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
        .select('id, name, start_date, end_date, status, operator_user_ids, panel_format_id, clients(company_name), campaign_format:panel_formats!campaigns_panel_format_id_fkey(name, has_qr_code, workflow_type)')
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
        panel_format_id: string | null
        clients: { company_name: string } | null
        campaign_format: { name: string; has_qr_code: boolean; workflow_type: 'qr' | 'deposit' | 'free_panel' } | null
      }>

      if (rows.length === 0) return []

      // 2. Recupere en une seule query les formats des visuels de ces campagnes
      const campaignIds = rows.map((c) => c.id)
      const { data: visuals } = await supabase
        .from('campaign_visuals')
        .select('campaign_id, panel_formats(name, has_qr_code, workflow_type)')
        .in('campaign_id', campaignIds)

      // Regroupe par campaign_id
      type FormatRow = { name: string; has_qr_code: boolean; workflow_type: 'qr' | 'deposit' | 'free_panel' }
      const formatsByCampaign = new Map<string, FormatRow[]>()
      for (const v of (visuals ?? []) as unknown as Array<{
        campaign_id: string
        panel_formats: FormatRow | null
      }>) {
        if (!v.panel_formats) continue
        const arr = formatsByCampaign.get(v.campaign_id) ?? []
        if (!arr.some((f) => f.name === v.panel_formats!.name)) {
          arr.push(v.panel_formats)
        }
        formatsByCampaign.set(v.campaign_id, arr)
      }

      return rows.map((c) => {
        const uniqFormats = formatsByCampaign.get(c.id) ?? []
        // Priorite 1 : format campagne top-level (nouveau flow)
        // Priorite 2 : derive des visuels (backward compat pour campagnes anciennes)
        let workflow: CampaignWorkflow
        if (c.campaign_format) {
          workflow = c.campaign_format.workflow_type
          // Assure que ce format est aussi dans la liste retournee pour l'UI
          if (!uniqFormats.some((f) => f.name === c.campaign_format!.name)) {
            uniqFormats.unshift(c.campaign_format)
          }
        } else {
          const workflowSet = new Set(uniqFormats.map((f) => f.workflow_type))
          if (workflowSet.size === 1) {
            workflow = Array.from(workflowSet)[0] as CampaignWorkflow
          } else if (workflowSet.size > 1) {
            workflow = 'mixed'
          } else {
            workflow = 'qr' // fallback historique
          }
        }
        const isDepositCampaign = workflow === 'deposit'
        return {
          id: c.id,
          name: c.name,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status,
          operator_user_ids: c.operator_user_ids ?? [],
          clients: c.clients,
          isDepositCampaign,
          workflow,
          formats: uniqFormats,
        }
      })
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}
