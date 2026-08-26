import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DiffusionPointType = 'free_panel' | 'deposit'

/**
 * Point de diffusion "sans contrat classique" : soit un panneau libre
 * (workflow free_panel, dans locations mais pas necessairement sous contrat)
 * soit un depot (sous-bocks/PLV chez commercant, jamais dans panels).
 * Rendu sur les cartes en complement des panneaux QR classiques.
 */
export interface DiffusionPoint {
  id: string
  type: DiffusionPointType
  lat: number
  lng: number
  name: string
  address: string | null
  campaignId: string
  campaignName: string | null
  photoPath: string
  createdAt: string
  quantity: number | null
}

/** Cap explicite pour dejouer le max-rows PostgREST (1000 par defaut sur
 *  Supabase). Sans .range, un dataset de 1058 lignes est silencieusement
 *  tronque a 1000. On monte tres au-dessus pour couvrir la saison. */
const MAX_ROWS = 20_000

export function useDiffusionPoints() {
  return useQuery({
    queryKey: ['diffusion-points'],
    queryFn: async (): Promise<DiffusionPoint[]> => {
      // 1. Fetch bruts, sans JOIN (JOIN implicite ferait sauter les rows
      //    dont la FK locations/campaigns est cassee). On hydrate les noms
      //    en 2e passe via des Map lookups.
      const [depRes, freeRes] = await Promise.all([
        supabase
          .from('campaign_deposits')
          .select('id, lat, lng, place_name, place_address, campaign_id, photo_path, quantity, created_at')
          .range(0, MAX_ROWS - 1),
        supabase
          .from('campaign_free_panels')
          .select('id, lat, lng, location_id, campaign_id, photo_path, created_at')
          .range(0, MAX_ROWS - 1),
      ])

      // Log explicite en cas d'erreur reseau/RLS pour ne pas passer sous
      // silence (l'ancien code retournait 0 point sans laisser de trace).
      if (depRes.error) {
        console.error('[useDiffusionPoints] campaign_deposits fetch error', depRes.error)
      }
      if (freeRes.error) {
        console.error('[useDiffusionPoints] campaign_free_panels fetch error', freeRes.error)
      }

      const deposits = depRes.data ?? []
      const freePanels = freeRes.data ?? []

      // 2. Hydrate campaign names + location names en un batch (evite les
      //    N+1 et le probleme du JOIN INNER qui droppait les rows).
      const campaignIds = new Set<string>()
      const locationIds = new Set<string>()
      for (const d of deposits) campaignIds.add(d.campaign_id)
      for (const f of freePanels) {
        campaignIds.add(f.campaign_id)
        if (f.location_id) locationIds.add(f.location_id)
      }

      const [campaignsRes, locationsRes] = await Promise.all([
        campaignIds.size > 0
          ? supabase.from('campaigns').select('id, name').in('id', Array.from(campaignIds))
          : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        locationIds.size > 0
          ? supabase.from('locations').select('id, name, address').in('id', Array.from(locationIds))
          : Promise.resolve({ data: [] as { id: string; name: string; address: string | null }[], error: null }),
      ])

      const campaignsById = new globalThis.Map<string, string>()
      for (const c of campaignsRes.data ?? []) campaignsById.set(c.id, c.name)
      const locationsById = new globalThis.Map<string, { name: string; address: string | null }>()
      for (const l of locationsRes.data ?? []) locationsById.set(l.id, { name: l.name, address: l.address })

      // 3. Construction finale des points de diffusion. Filtre lat/lng
      //    conserve, mais on garde tous les rows avec coords meme si le
      //    JOIN campaigns/locations echoue (fallback nom generique).
      const depositPoints: DiffusionPoint[] = deposits
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({
          id: `deposit-${d.id}`,
          type: 'deposit' as const,
          lat: Number(d.lat),
          lng: Number(d.lng),
          name: d.place_name,
          address: d.place_address ?? null,
          campaignId: d.campaign_id,
          campaignName: campaignsById.get(d.campaign_id) ?? null,
          photoPath: d.photo_path,
          createdAt: d.created_at,
          quantity: d.quantity,
        }))

      const freePanelPoints: DiffusionPoint[] = freePanels
        .filter((f) => f.lat != null && f.lng != null)
        .map((f) => {
          const location = f.location_id ? locationsById.get(f.location_id) : undefined
          return {
            id: `free-${f.id}`,
            type: 'free_panel' as const,
            lat: Number(f.lat),
            lng: Number(f.lng),
            name: location?.name ?? 'Panneau libre',
            address: location?.address ?? null,
            campaignId: f.campaign_id,
            campaignName: campaignsById.get(f.campaign_id) ?? null,
            photoPath: f.photo_path,
            createdAt: f.created_at,
            quantity: null,
          }
        })

      return [...depositPoints, ...freePanelPoints]
    },
    staleTime: 60_000,
  })
}

export const DIFFUSION_POINT_COLORS: Record<DiffusionPointType, string> = {
  free_panel: '#3b82f6', // bleu
  deposit: '#a855f7',    // violet
}
