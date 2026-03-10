import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Panel, InsertTables, UpdateTables } from '@/types'

export function usePanels() {
  return useQuery({
    queryKey: ['panels'],
    queryFn: async (): Promise<Panel[]> => {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePanel(id: string | undefined) {
  return useQuery({
    queryKey: ['panels', id],
    queryFn: async (): Promise<Panel> => {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function usePanelByQrCode(qrCode: string | undefined) {
  return useQuery({
    queryKey: ['panels', 'qr', qrCode],
    queryFn: async (): Promise<Panel | null> => {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('qr_code', qrCode!)
        .maybeSingle()
      if (error) throw error
      return data
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
