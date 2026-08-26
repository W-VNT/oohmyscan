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

export function useDiffusionPoints() {
  return useQuery({
    queryKey: ['diffusion-points'],
    queryFn: async (): Promise<DiffusionPoint[]> => {
      const [depRes, freeRes] = await Promise.all([
        supabase
          .from('campaign_deposits')
          .select('id, lat, lng, place_name, place_address, campaign_id, photo_path, quantity, created_at, campaigns(name)'),
        supabase
          .from('campaign_free_panels')
          .select('id, lat, lng, campaign_id, photo_path, created_at, locations(name, address), campaigns(name)'),
      ])

      const deposits: DiffusionPoint[] = (depRes.data ?? [])
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => {
          const campaign = d.campaigns as unknown as { name: string } | null
          return {
            id: `deposit-${d.id}`,
            type: 'deposit' as const,
            lat: Number(d.lat),
            lng: Number(d.lng),
            name: d.place_name,
            address: d.place_address ?? null,
            campaignId: d.campaign_id,
            campaignName: campaign?.name ?? null,
            photoPath: d.photo_path,
            createdAt: d.created_at,
            quantity: d.quantity,
          }
        })

      const freePanels: DiffusionPoint[] = (freeRes.data ?? [])
        .filter((f) => f.lat != null && f.lng != null)
        .map((f) => {
          const location = f.locations as unknown as { name: string; address: string | null } | null
          const campaign = f.campaigns as unknown as { name: string } | null
          return {
            id: `free-${f.id}`,
            type: 'free_panel' as const,
            lat: Number(f.lat),
            lng: Number(f.lng),
            name: location?.name ?? 'Panneau libre',
            address: location?.address ?? null,
            campaignId: f.campaign_id,
            campaignName: campaign?.name ?? null,
            photoPath: f.photo_path,
            createdAt: f.created_at,
            quantity: null,
          }
        })

      return [...deposits, ...freePanels]
    },
    staleTime: 60_000,
  })
}

export const DIFFUSION_POINT_COLORS: Record<DiffusionPointType, string> = {
  free_panel: '#3b82f6', // bleu
  deposit: '#a855f7',    // violet
}
