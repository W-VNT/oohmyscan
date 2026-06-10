import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Location, InsertTables, UpdateTables } from '@/types'

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: async (): Promise<Location> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useLocationPanels(locationId: string | undefined) {
  return useQuery({
    queryKey: ['locations', locationId, 'panels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('location_id', locationId!)
        .order('zone_label')
      if (error) throw error
      return data
    },
    enabled: !!locationId,
  })
}

export function useLocationContract(locationId: string | undefined) {
  return useQuery({
    queryKey: ['locations', locationId, 'contract'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_contracts')
        .select('*')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!locationId,
  })
}

export function useContractAmendments(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', contractId, 'amendments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_amendments')
        .select('*')
        .eq('contract_id', contractId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!contractId,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (location: InsertTables<'locations'>) => {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

/**
 * Supprime un lieu (cascade : panel_contracts + contract_amendments).
 * Les panneaux du lieu sont orphelinés (location_id mis à NULL), pas supprimés.
 * Pratique pour cleanup de tests.
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Orpheline les panneaux (FK panels.location_id n'a pas de CASCADE)
      const { error: unlinkErr } = await supabase
        .from('panels')
        .update({ location_id: null })
        .eq('location_id', id)
      if (unlinkErr) throw unlinkErr

      // 2. Supprime le lieu (cascade panel_contracts -> contract_amendments)
      const { error } = await supabase.from('locations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['panels'] })
    },
  })
}

/**
 * Supprime un contrat (cascade auto sur contract_amendments).
 * Le trigger DB doit reset locations.has_contract = false.
 */
export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('panel_contracts')
        .delete()
        .eq('id', contractId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'locations'> & { id: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locations', data.id] })
    },
  })
}

export function useSearchLocations(search: string) {
  return useQuery({
    queryKey: ['locations', 'search', search],
    queryFn: async (): Promise<Location[]> => {
      // Escape ILIKE special characters and Supabase .or() delimiters
      const escaped = search.trim()
        .replace(/[%_\\]/g, (c) => `\\${c}`)
        .replace(/[,()]/g, '')
      const q = `%${escaped}%`
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.${q},city.ilike.${q},address.ilike.${q}`)
        .order('name')
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: search.trim().length >= 1,
  })
}
