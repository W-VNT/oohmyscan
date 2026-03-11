import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Loader2, Camera, Megaphone, PanelTop, ScanLine } from 'lucide-react'
import { PHOTO_TYPE_LABELS } from '@/lib/constants'
import type { PanelStatus, PhotoType } from '@/lib/constants'
import { Link } from 'react-router-dom'

export function ActivityPage() {
  const { session } = useAuth()

  const { data: recentPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*, panels(reference, name, status)')
        .eq('taken_by', session!.user.id)
        .order('taken_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!session,
  })

  const { data: recentAssignments, isLoading: assignLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(reference, name), campaigns(name, client)')
        .eq('assigned_by', session!.user.id)
        .order('assigned_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!session,
  })

  const isLoading = photosLoading || assignLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Merge and sort all activity
  type ActivityItem = {
    id: string
    type: 'photo' | 'assignment'
    date: string
    panelRef: string
    panelStatus?: string
    detail: string
  }

  const activities: ActivityItem[] = [
    ...(recentPhotos ?? []).map((p) => {
      const panel = (p as Record<string, unknown>).panels as { reference: string; name?: string; status: string } | null
      return {
        id: p.id,
        type: 'photo' as const,
        date: p.taken_at,
        panelRef: panel?.name || panel?.reference || '—',
        panelStatus: panel?.status,
        detail: PHOTO_TYPE_LABELS[p.photo_type as PhotoType] ?? p.photo_type,
      }
    }),
    ...(recentAssignments ?? []).map((a) => {
      const panel = (a as Record<string, unknown>).panels as { reference: string; name?: string } | null
      const campaign = (a as Record<string, unknown>).campaigns as { name: string; client: string } | null
      return {
        id: a.id,
        type: 'assignment' as const,
        date: a.assigned_at,
        panelRef: panel?.name || panel?.reference || '—',
        detail: campaign?.name ?? '—',
      }
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Mon activité</h1>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PanelTop className="h-12 w-12" />
          <p className="mt-4">Aucune activité récente</p>
          <Link
            to="/scan"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground"
          >
            <ScanLine className="size-3.5" />
            Scanner un point
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                item.type === 'photo' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
              }`}>
                {item.type === 'photo' ? <Camera className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.panelRef}</p>
                  {item.panelStatus && (
                    <StatusBadge status={item.panelStatus as PanelStatus} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
