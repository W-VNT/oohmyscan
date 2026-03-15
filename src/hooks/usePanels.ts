import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PanelWithLocation, InsertTables, UpdateTables } from '@/types'

const PAGE_SIZE = 30

// Lightweight fields for lists — detail page uses usePanel('*') separately
const LIST_FIELDS = 'id, name, reference, status, city, address, lat, lng, format, qr_code, created_at, zone_label, location_id, locations(name)'

export function usePanels() {
  return useQuery({
    queryKey: ['panels'],
    queryFn: async (): Promise<PanelWithLocation[]> => {
      const { data, error } = await supabase
        .from('panels')
        .select(LIST_FIELDS)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as PanelWithLocation[]
    },
  })
}

export function useInfinitePanels(search: string) {
  return useInfiniteQuery({
    queryKey: ['panels-infinite', search],
    queryFn: async ({ pageParam = 0 }): Promise<PanelWithLocation[]> => {
      let query = supabase
        .from('panels')
        .select(LIST_FIELDS)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      if (search.trim()) {
        const q = `%${search.trim()}%`
        query = query.or(`reference.ilike.${q},city.ilike.${q},name.ilike.${q}`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as PanelWithLocation[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
  })
}

export function usePanel(id: string | undefined) {
  return useQuery({
    queryKey: ['panels', id],
    queryFn: async (): Promise<PanelWithLocation> => {
      const { data, error } = await supabase
        .from('panels')
        .select('*, locations(name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as PanelWithLocation
    },
    enabled: !!id,
  })
}

export function usePanelByQrCode(qrCode: string | undefined) {
  return useQuery({
    queryKey: ['panels', 'qr', qrCode],
    queryFn: async (): Promise<PanelWithLocation | null> => {
      const { data, error } = await supabase
        .from('panels')
        .select('*, locations(name)')
        .eq('qr_code', qrCode!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as PanelWithLocation | null
    },
    enabled: !!qrCode,
  })
}

export function useCreatePanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (panel: InsertTables<'panels'>) => {
      const { data, error } = await supabase
        .from('panels')
        .insert(panel)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panels'] })
    },
  })
}

export function useUpdatePanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateTables<'panels'> & { id: string }) => {
      const { data, error } = await supabase
        .from('panels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['panels', data.id] })
    },
  })
}
