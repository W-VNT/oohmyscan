import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type LeadStatus = 'nouveau' | 'contacte' | 'converti' | 'perdu' | 'spam'

export interface Lead {
  id: string
  name: string
  company: string | null
  email: string
  city: string | null
  support_interest: string | null
  message: string
  source: string | null
  is_read: boolean
  status: LeadStatus
  notes: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  converti: 'Converti',
  perdu: 'Perdu',
  spam: 'Spam',
}

export const LEAD_SUPPORT_LABELS: Record<string, string> = {
  'diffusion-sur-mesure': 'Diffusion sur-mesure',
  'medias-tactiques': 'Médias tactiques',
  'reseaux-affichage': "Réseaux d'affichage",
  'animation-terrain': 'Animation terrain',
  digital: 'Digital (SMS/RCS ou Display)',
  multiple: 'Plusieurs familles / Indécis',
}

// Normalise les colonnes ajoutees par la migration workflow (fallback safe
// si la migration n'a pas encore tourne)
function normalize(row: Record<string, unknown>): Lead {
  return {
    ...row,
    status: (row.status as LeadStatus | null) ?? 'nouveau',
    notes: (row.notes as string | null) ?? null,
    handled_by: (row.handled_by as string | null) ?? null,
    handled_at: (row.handled_at as string | null) ?? null,
  } as Lead
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(normalize)
    },
  })
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async (): Promise<Lead> => {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return normalize(data)
    },
    enabled: !!id,
  })
}

interface UpdateLeadInput {
  id: string
  status?: LeadStatus
  notes?: string | null
  is_read?: boolean
  handled_by?: string | null
  handled_at?: string | null
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLeadInput) => {
      const { data, error } = await supabase
        .from('contact_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', variables.id] })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_requests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
