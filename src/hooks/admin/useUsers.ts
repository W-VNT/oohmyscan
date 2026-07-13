import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'operator'
  phone: string | null
  avatar_url: string | null
  status: 'invited' | 'active'
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

export function useAdmins() {
  return useQuery({
    queryKey: ['users', 'admins'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
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
      // panel_count englobe les 3 sources d'assignation :
      //  - panel_campaigns.assigned_by (QR)
      //  - campaign_deposits.operator_id (sous-bock)
      //  - campaign_free_panels.operator_id (panneau libre)
      // photo_count = uniquement panel_photos (photos "install" et "campagne"
      // sur les panneaux QR). Les photos de deposits/free_panels sont deja
      // comptees dans panel_count donc pas double-comptage.
      const [assignRes, photosRes, depositsRes, freePanelsRes] = await Promise.all([
        supabase.from('panel_campaigns').select('assigned_by, assigned_at').not('assigned_by', 'is', null),
        supabase.from('panel_photos').select('taken_by, taken_at').not('taken_by', 'is', null),
        supabase.from('campaign_deposits').select('operator_id, created_at'),
        supabase.from('campaign_free_panels').select('operator_id, created_at'),
      ])
      if (assignRes.error) throw assignRes.error
      if (photosRes.error) throw photosRes.error
      if (depositsRes.error) throw depositsRes.error
      if (freePanelsRes.error) throw freePanelsRes.error

      const statsMap: Record<string, OperatorStats> = {}
      const ensure = (uid: string) => {
        if (!statsMap[uid]) statsMap[uid] = { user_id: uid, panel_count: 0, photo_count: 0, last_activity: null }
        return statsMap[uid]
      }
      const bumpActivity = (uid: string, when: string | null) => {
        if (!when) return
        const s = statsMap[uid]
        if (!s.last_activity || when > s.last_activity) s.last_activity = when
      }

      for (const a of assignRes.data ?? []) {
        if (!a.assigned_by) continue
        const s = ensure(a.assigned_by)
        s.panel_count++
        bumpActivity(a.assigned_by, a.assigned_at)
      }
      for (const d of depositsRes.data ?? []) {
        if (!d.operator_id) continue
        const s = ensure(d.operator_id)
        s.panel_count++
        bumpActivity(d.operator_id, d.created_at)
      }
      for (const f of freePanelsRes.data ?? []) {
        if (!f.operator_id) continue
        const s = ensure(f.operator_id)
        s.panel_count++
        bumpActivity(f.operator_id, f.created_at)
      }
      for (const p of photosRes.data ?? []) {
        if (!p.taken_by) continue
        const s = ensure(p.taken_by)
        s.photo_count++
        bumpActivity(p.taken_by, p.taken_at)
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
