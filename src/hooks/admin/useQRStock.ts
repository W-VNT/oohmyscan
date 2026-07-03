import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QRStockItem, QRStockWithPanel } from '@/types'

export type { QRStockItem, QRStockWithPanel }

const PAGE_SIZE = 500

export type QRStockFilter = 'all' | 'available' | 'assigned'
export type QRStockSort = 'serial-desc' | 'serial-asc' | 'newest' | 'oldest'

interface QRStockOptions {
  filter?: QRStockFilter
  sort?: QRStockSort
  search?: string
}

/**
 * Applique le filtre / tri / recherche à un query builder Supabase.
 * Recherche : ILIKE sur uuid_code, OU serial_number = valeur numerique
 * (si l'input est un nombre pur ou "#N").
 */
function applyFilters<T extends { eq: Function; ilike: Function; or: Function; order: Function }>(
  base: T,
  opts: QRStockOptions,
): T {
  let q = base as unknown as T
  if (opts.filter === 'available') q = (q as any).eq('is_assigned', false)
  if (opts.filter === 'assigned') q = (q as any).eq('is_assigned', true)

  if (opts.search?.trim()) {
    const raw = opts.search.trim().toLowerCase()
    const asNum = parseInt(raw.replace(/^#/, ''), 10)
    if (!isNaN(asNum) && String(asNum) === raw.replace(/^#/, '')) {
      // Recherche numerique pure : serial_number match
      q = (q as any).eq('serial_number', asNum)
    } else {
      // Recherche texte : ILIKE sur uuid_code
      q = (q as any).ilike('uuid_code', `%${raw}%`)
    }
  }

  switch (opts.sort ?? 'serial-desc') {
    case 'serial-desc':
      q = (q as any).order('serial_number', { ascending: false })
      break
    case 'serial-asc':
      q = (q as any).order('serial_number', { ascending: true })
      break
    case 'newest':
      q = (q as any).order('generated_at', { ascending: false })
      break
    case 'oldest':
      q = (q as any).order('generated_at', { ascending: true })
      break
  }
  return q
}

/**
 * Fetch paginé server-side des QR codes avec filter/sort/search.
 * useInfiniteQuery : chaque page = 500 rows, fetch-next-page à la demande.
 */
export function useInfiniteQRStock(opts: QRStockOptions) {
  return useInfiniteQuery({
    queryKey: ['qr-stock', 'infinite', opts],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from('qr_stock').select('*, panels(reference)')
      query = applyFilters(query as any, opts)
      const { data, error } = await query.range(
        (pageParam as number) * PAGE_SIZE,
        (pageParam as number) * PAGE_SIZE + PAGE_SIZE - 1,
      )
      if (error) throw error
      const items = (data ?? []) as unknown as QRStockWithPanel[]
      return {
        items,
        nextPage: items.length === PAGE_SIZE ? (pageParam as number) + 1 : undefined,
      }
    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: 30_000,
  })
}

/** Compte le total de QR matchant les filtres — pour affichage "N / Total". */
export function useQRStockFilteredCount(opts: QRStockOptions) {
  return useQuery({
    queryKey: ['qr-stock', 'count', opts],
    queryFn: async () => {
      let query = supabase.from('qr_stock').select('*', { count: 'exact', head: true })
      query = applyFilters(query as any, opts)
      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
  })
}

/**
 * Fetch tous les IDs matchant le filtre courant, sans fetch les données.
 * Utilisé pour "Tout sélectionner" cross-pages. Renvoie juste les IDs.
 */
export async function fetchAllQRIds(opts: QRStockOptions): Promise<string[]> {
  let query = supabase.from('qr_stock').select('id')
  query = applyFilters(query as any, opts)
  const { data, error } = await (query as any).range(0, 99999)
  if (error) throw error
  return (data ?? []).map((r: { id: string }) => r.id)
}

/**
 * Fetch les IDs + serial_number + uuid_code des QR dans une plage de serial.
 * Utilisé pour la sélection par plage cross-pages, et pour export Dymo qui
 * a besoin de l'uuid_code.
 */
export async function fetchQRsInSerialRange(
  from: number,
  to: number,
): Promise<Array<{ id: string; uuid_code: string; serial_number: number }>> {
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  const { data, error } = await supabase
    .from('qr_stock')
    .select('id, uuid_code, serial_number')
    .gte('serial_number', lo)
    .lte('serial_number', hi)
    .order('serial_number', { ascending: true })
  if (error) throw error
  return (data ?? []) as Array<{ id: string; uuid_code: string; serial_number: number }>
}

/**
 * Fetch les data (uuid_code, serial_number) d'une liste d'IDs.
 * Pour l'export Dymo/ZIP quand les items sélectionnés couvrent des pages
 * non encore chargées. Fetch par batches pour éviter les URLs trop longues.
 */
export async function fetchQRsByIds(
  ids: string[],
): Promise<Array<{ id: string; uuid_code: string; serial_number: number }>> {
  if (ids.length === 0) return []
  const BATCH = 200
  const result: Array<{ id: string; uuid_code: string; serial_number: number }> = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const { data, error } = await supabase
      .from('qr_stock')
      .select('id, uuid_code, serial_number')
      .in('id', batch)
      .order('serial_number', { ascending: true })
    if (error) throw error
    result.push(...(data ?? []))
  }
  return result
}

export function useQRStockStats() {
  return useQuery({
    queryKey: ['qr-stock', 'stats'],
    queryFn: async () => {
      // 2 count-only queries au lieu de fetch toutes les rows.
      const [totalRes, assignedRes] = await Promise.all([
        supabase.from('qr_stock').select('*', { count: 'exact', head: true }),
        supabase.from('qr_stock').select('*', { count: 'exact', head: true }).eq('is_assigned', true),
      ])
      if (totalRes.error) throw totalRes.error
      if (assignedRes.error) throw assignedRes.error
      const total = totalRes.count ?? 0
      const assigned = assignedRes.count ?? 0
      return { total, assigned, available: total - assigned }
    },
    staleTime: 30_000,
  })
}

export function useDeleteQRCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('qr_stock')
        .delete()
        .in('id', ids)
        .eq('is_assigned', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-stock'] })
    },
  })
}

export function useGenerateQRCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (count: number) => {
      const items = Array.from({ length: count }, () => ({
        uuid_code: crypto.randomUUID(),
      }))
      const { data, error } = await supabase
        .from('qr_stock')
        .insert(items)
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-stock'] })
    },
  })
}
