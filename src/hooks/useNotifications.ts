import { useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown>
  read: boolean
  read_at: string | null
  created_at: string
}

/**
 * Fetch les notifications de l'utilisateur courant.
 * Realtime : se réabonne aux INSERT/UPDATE via Supabase channels pour
 * refresh automatique. Le badge de compteur est instantané.
 */
export function useNotifications() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as unknown as Notification[]
    },
    enabled: !!userId,
    staleTime: 30_000,
  })

  // Realtime subscription : INSERT/UPDATE => invalidate + soft refetch.
  // Wrap dans try/catch : sur certains navigateurs (Safari + CSP strict), la
  // WebSocket peut jeter synchronement. On veut pas crasher toute l'app pour ça
  // — le fallback c'est le staleTime + polling naturel de tanstack query.
  useEffect(() => {
    if (!userId) return
    try {
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
          },
        )
        .subscribe()
      return () => {
        try {
          supabase.removeChannel(channel)
        } catch {
          // no-op
        }
      }
    } catch (e) {
      console.warn('[notifications] realtime indisponible, fallback polling', e)
    }
  }, [userId, queryClient])

  return query
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications()
  return (notifications ?? []).filter((n) => !n.read).length
}

export function useMarkNotificationRead() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId) return
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })
}

/**
 * Petit helper hors query pour forcer un refresh externe (ex: après un
 * event métier connu client-side, sans attendre la realtime).
 */
export function useNotificationsRefresh() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
  }, [queryClient, userId])
}

