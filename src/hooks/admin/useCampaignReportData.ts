import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  extractPostalFromAddress,
  postalCodeToRegion,
  type RegionFR,
} from '@/lib/regions-fr'
import type {
  CampaignReportData,
  PanelLite,
  PhotoLite,
} from '@/lib/campaign-report-types'

/**
 * Agrege toutes les donnees necessaires pour generer un rapport de campagne :
 * panneaux groupes par region, photos indexees par panel_id, stats reseau,
 * contact commercial, textes par defaut.
 *
 * Pas de cote effet : ce hook ne cree pas de rapport, il prepare juste la matiere.
 */
export function useCampaignReportData(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-report-data', campaignId],
    queryFn: async (): Promise<CampaignReportData | null> => {
      if (!campaignId) return null

      // 1. Campagne + client
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(
          `
          id, name, start_date, end_date, client_id,
          clients (id, company_name, commercial_id)
        `,
        )
        .eq('id', campaignId)
        .single()
      if (campaignError) throw campaignError
      if (!campaign) throw new Error('Campagne introuvable')

      const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients

      // 2. Panneaux assignes a la campagne (avec location pour le postal_code)
      const { data: assignments, error: panelsError } = await supabase
        .from('panel_campaigns')
        .select(
          `
          panel_id,
          panels (
            id, reference, name, city, address, lat, lng,
            location_id,
            locations (postal_code)
          )
        `,
        )
        .eq('campaign_id', campaignId)
      if (panelsError) throw panelsError

      const panels: PanelLite[] = (assignments ?? [])
        .map((a) => {
          const p = Array.isArray(a.panels) ? a.panels[0] : a.panels
          if (!p) return null
          const loc = Array.isArray(p.locations) ? p.locations[0] : p.locations
          // Resolution code postal : location.postal_code prioritaire, sinon
          // extraction depuis panel.address.
          const postal_code =
            (loc && (loc as { postal_code?: string }).postal_code) ||
            extractPostalFromAddress(p.address) ||
            null
          return {
            id: p.id,
            reference: p.reference,
            name: p.name,
            city: p.city,
            address: p.address,
            postal_code,
            lat: p.lat,
            lng: p.lng,
          }
        })
        .filter((p): p is PanelLite => p !== null)

      const panelIds = panels.map((p) => p.id)

      // 3. Photos des panneaux
      const photosByPanelId = new Map<string, PhotoLite[]>()
      if (panelIds.length > 0) {
        const { data: photos, error: photosError } = await supabase
          .from('panel_photos')
          .select('id, panel_id, storage_path, photo_type, taken_at')
          .in('panel_id', panelIds)
          .order('taken_at', { ascending: false })
        if (photosError) throw photosError
        for (const ph of photos ?? []) {
          const list = photosByPanelId.get(ph.panel_id) ?? []
          list.push(ph as PhotoLite)
          photosByPanelId.set(ph.panel_id, list)
        }
      }

      const totalPhotos = Array.from(photosByPanelId.values()).reduce(
        (sum, l) => sum + l.length,
        0,
      )

      // 4. Groupement panneaux par region
      const panelsByRegion = new Map<RegionFR, PanelLite[]>()
      for (const p of panels) {
        const region = postalCodeToRegion(p.postal_code)
        const list = panelsByRegion.get(region) ?? []
        list.push(p)
        panelsByRegion.set(region, list)
      }

      // 5. Nombre de lieux uniques dans la campagne
      const locationIds = new Set(
        (assignments ?? [])
          .map((a) => {
            const p = Array.isArray(a.panels) ? a.panels[0] : a.panels
            return (p as { location_id?: string | null })?.location_id
          })
          .filter(Boolean),
      )

      // 6. Stats reseau globales (count panneaux et lieux totaux)
      const [{ count: totalPanelsAll }, { count: totalLocationsAll }] = await Promise.all([
        supabase.from('panels').select('*', { count: 'exact', head: true }),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
      ])

      // 7. Contact commercial (depuis client.commercial_id)
      let defaultContact: CampaignReportData['defaultContact'] = null
      if (client?.commercial_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', client.commercial_id)
          .maybeSingle()
        // L'email n'est pas sur profiles : on le recupere via auth.users via RPC ou
        // simplement on laisse l'admin le saisir. Pour Phase 1, on met juste nom+tel.
        if (profile) {
          defaultContact = {
            name: profile.full_name ?? '',
            email: '', // sera complete par l'admin via override
            phone: profile.phone ?? '',
          }
        }
      }

      // 8. Textes / liens par defaut depuis company_settings
      const { data: settings } = await supabase
        .from('company_settings')
        .select('default_report_intro_text, report_linkedin_url, report_website_url')
        .maybeSingle()
      const s = settings as
        | {
            default_report_intro_text: string | null
            report_linkedin_url: string | null
            report_website_url: string | null
          }
        | null

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        clientName: client?.company_name ?? '',
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        totalPanels: panels.length,
        totalPhotos,
        totalLocations: locationIds.size,
        panelsByRegion,
        photosByPanelId,
        networkStats: {
          totalLocationsAll: totalLocationsAll ?? 0,
          totalPanelsAll: totalPanelsAll ?? 0,
        },
        defaultContact,
        defaultIntroText: s?.default_report_intro_text ?? '',
        defaultLinkedinUrl: s?.report_linkedin_url ?? null,
        defaultWebsiteUrl: s?.report_website_url ?? null,
      }
    },
    enabled: !!campaignId,
    staleTime: 60_000,
  })
}
