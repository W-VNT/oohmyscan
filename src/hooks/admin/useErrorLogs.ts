import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type LogSeverity = 'info' | 'warn' | 'error'

export interface ActivityLog {
  id: string
  created_at: string
  user_id: string | null
  user_role: string | null
  severity: LogSeverity
  context: string
  action: string
  message: string
  details: Record<string, unknown> | null
  user_agent: string | null
  url: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  author?: {
    full_name: string | null
  } | null
}

export interface ActivityLogsFilters {
  context?: string
  userId?: string
  severity?: LogSeverity | 'all'
  onlyUnresolved?: boolean
  limit?: number
}

export function useActivityLogs(filters: ActivityLogsFilters = {}) {
  const { context, userId, severity, onlyUnresolved, limit = 200 } = filters
  return useQuery({
    queryKey: ['activity-logs', context, userId, severity, onlyUnresolved, limit],
    queryFn: async (): Promise<ActivityLog[]> => {
      let q = supabase
        .from('activity_logs')
        .select('*, author:profiles!activity_logs_user_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (context && context !== 'all') q = q.eq('context', context)
      if (userId) q = q.eq('user_id', userId)
      if (severity && severity !== 'all') q = q.eq('severity', severity)
      if (onlyUnresolved) q = q.eq('resolved', false)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ActivityLog[]
    },
    staleTime: 30_000,
  })
}

/**
 * Count des erreurs (severity=error) non-resolues pour le badge sidebar.
 * Les logs 'info' (actions) ne remontent pas dans le badge.
 */
export function useUnresolvedErrorCount() {
  return useQuery({
    queryKey: ['activity-logs-unresolved-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .eq('severity', 'error')
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 60_000,
  })
}

export function useMarkLogResolved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user?.id ?? null
      const { error } = await supabase
        .from('activity_logs')
        .update({
          resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolved_by: resolved ? uid : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      qc.invalidateQueries({ queryKey: ['activity-logs-unresolved-count'] })
    },
  })
}

export function useDeleteLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activity_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      qc.invalidateQueries({ queryKey: ['activity-logs-unresolved-count'] })
    },
  })
}
