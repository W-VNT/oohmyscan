import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'operator'
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface OperatorStats {
  user_id: string
  panel_count: number
  photo_count: number
  last_activity: string | null
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useOperatorStats() {
  return useQuery({
    queryKey: ['operator-stats'],
    queryFn: async (): Promise<OperatorStats[]> => {
      const { data: assignments, error: aErr } = await supabase
        .from('panel_campaigns')
        .select('assigned_by, assigned_at')
        .not('assigned_by', 'is', null)
      if (aErr) throw aErr

      const { data: photos, error: pErr } = await supabase
        .from('panel_photos')
        .select('taken_by, taken_at')
        .not('taken_by', 'is', null)
      if (pErr) throw pErr

      const statsMap: Record<string, OperatorStats> = {}

      for (const a of assignments ?? []) {
        if (!a.assigned_by) continue
        if (!statsMap[a.assigned_by]) {
          statsMap[a.assigned_by] = { user_id: a.assigned_by, panel_count: 0, photo_count: 0, last_activity: null }
        }
        statsMap[a.assigned_by].panel_count++
        if (!statsMap[a.assigned_by].last_activity || a.assigned_at > statsMap[a.assigned_by].last_activity!) {
          statsMap[a.assigned_by].last_activity = a.assigned_at
        }
      }

      for (const p of photos ?? []) {
        if (!p.taken_by) continue
        if (!statsMap[p.taken_by]) {
          statsMap[p.taken_by] = { user_id: p.taken_by, panel_count: 0, photo_count: 0, last_activity: null }
        }
        statsMap[p.taken_by].photo_count++
        if (!statsMap[p.taken_by].last_activity || p.taken_at > statsMap[p.taken_by].last_activity!) {
          statsMap[p.taken_by].last_activity = p.taken_at
        }
      }

      return Object.values(statsMap)
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role, ...profileUpdates }: Partial<Profile> & { id: string }) => {
      // If role is being changed, use the secure RPC function
      if (role !== undefined) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('admin_update_user_role', {
            target_user_id: id,
            new_role: role,
          })
        if (rpcError) throw rpcError
        if (rpcResult && !rpcResult.success) {
          throw new Error(rpcResult.error ?? 'Erreur lors du changement de rôle')
        }
      }

      // If there are other profile fields to update, do a direct update
      if (Object.keys(profileUpdates).length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      }

      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role, full_name }: { email: string; role: 'admin' | 'operator'; full_name: string }) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, full_name, role },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { success: boolean; message: string; userId: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
