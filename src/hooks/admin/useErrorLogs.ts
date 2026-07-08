import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ErrorLog {
  id: string
  created_at: string
  user_id: string | null
  user_role: string | null
  context: string
  action: string
  message: string
  details: Record<string, unknown> | null
  user_agent: string | null
  url: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  // Denormalized author (fetched via view/join)
  author?: {
    full_name: string | null
    email?: string | null
  } | null
}

export interface ErrorLogsFilters {
  context?: string
  userId?: string
  onlyUnresolved?: boolean
  limit?: number
}

export function useErrorLogs(filters: ErrorLogsFilters = {}) {
  const { context, userId, onlyUnresolved, limit = 100 } = filters
  return useQuery({
    queryKey: ['error-logs', context, userId, onlyUnresolved, limit],
    queryFn: async (): Promise<ErrorLog[]> => {
      let q = supabase
        .from('error_logs')
        .select('*, author:profiles!error_logs_user_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (context && context !== 'all') q = q.eq('context', context)
      if (userId) q = q.eq('user_id', userId)
      if (onlyUnresolved) q = q.eq('resolved', false)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ErrorLog[]
    },
    staleTime: 30_000,
  })
}

export function useUnresolvedErrorCount() {
  return useQuery({
    queryKey: ['error-logs-unresolved-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 60_000,
  })
}

export function useMarkErrorResolved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user?.id ?? null
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
          resolved_by: resolved ? uid : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['error-logs'] })
      qc.invalidateQueries({ queryKey: ['error-logs-unresolved-count'] })
    },
  })
}

export function useDeleteErrorLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('error_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['error-logs'] })
      qc.invalidateQueries({ queryKey: ['error-logs-unresolved-count'] })
    },
  })
}
