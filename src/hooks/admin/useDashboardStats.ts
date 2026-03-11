import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface PanelStats {
  total: number
  active: number
  vacant: number
  maintenance: number
  missing: number
}

interface CampaignEndingSoon {
  id: string
  name: string
  client: string
  end_date: string
  daysLeft: number
}

interface ActivityItem {
  id: string
  type: 'photo' | 'assignment'
  date: string
  panelName: string
  panelId: string
  userName: string | null
  detail: string
}

interface InvoiceStats {
  totalPaidTTC: number
  totalPaidCount: number
  totalSentTTC: number
  totalSentCount: number
  totalOverdueTTC: number
  totalOverdueCount: number
  monthPaidTTC: number
  monthPaidCount: number
}

export function usePanelStats() {
  return useQuery({
    queryKey: ['dashboard', 'panel-stats'],
    queryFn: async (): Promise<PanelStats> => {
      const { data, error } = await supabase
        .from('panels')
        .select('status')
      if (error) throw error

      const stats: PanelStats = { total: 0, active: 0, vacant: 0, maintenance: 0, missing: 0 }
      for (const p of data) {
        stats.total++
        if (p.status === 'active') stats.active++
        else if (p.status === 'vacant') stats.vacant++
        else if (p.status === 'maintenance') stats.maintenance++
        else if (p.status === 'missing') stats.missing++
      }
      return stats
    },
    staleTime: 60_000,
  })
}

export function useCampaignStats() {
  return useQuery({
    queryKey: ['dashboard', 'campaign-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status, end_date, client_id, clients(company_name)')
        .order('end_date', { ascending: true })
      if (error) throw error

      const rows = data as unknown as Array<{
        id: string; name: string; status: string; end_date: string
        clients: { company_name: string } | null
      }>

      const total = rows.length
      const active = rows.filter((c) => c.status === 'active')
      const endingSoon: CampaignEndingSoon[] = active
        .filter((c) => {
          const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
          return daysLeft >= 0 && daysLeft <= 7
        })
        .map((c) => ({
          id: c.id,
          name: c.name,
          client: c.clients?.company_name ?? '—',
          end_date: c.end_date,
          daysLeft: Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000),
        }))

      return { total, activeCount: active.length, endingSoon }
    },
    staleTime: 60_000,
  })
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ['dashboard', 'invoice-stats'],
    queryFn: async (): Promise<InvoiceStats> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('status, total_ttc, paid_at')
      if (error) throw error

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const stats: InvoiceStats = {
        totalPaidTTC: 0, totalPaidCount: 0,
        totalSentTTC: 0, totalSentCount: 0,
        totalOverdueTTC: 0, totalOverdueCount: 0,
        monthPaidTTC: 0, monthPaidCount: 0,
      }

      for (const inv of data) {
        if (inv.status === 'paid') {
          stats.totalPaidTTC += inv.total_ttc
          stats.totalPaidCount++
          if (inv.paid_at && inv.paid_at >= monthStart) {
            stats.monthPaidTTC += inv.total_ttc
            stats.monthPaidCount++
          }
        } else if (inv.status === 'sent') {
          stats.totalSentTTC += inv.total_ttc
          stats.totalSentCount++
        } else if (inv.status === 'overdue') {
          stats.totalOverdueTTC += inv.total_ttc
          stats.totalOverdueCount++
        }
      }

      return stats
    },
    staleTime: 60_000,
  })
}

type PhotoRow = {
  id: string; photo_type: string; taken_at: string
  panels: { id: string; name: string | null; reference: string } | null
  profiles: { full_name: string } | null
}

type AssignmentRow = {
  id: string; assigned_at: string
  panels: { id: string; name: string | null; reference: string } | null
  campaigns: { name: string } | null
  profiles: { full_name: string } | null
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch recent photos
      const { data: rawPhotos, error: photosError } = await supabase
        .from('panel_photos')
        .select('id, photo_type, taken_at, panels(id, name, reference), profiles(full_name)')
        .order('taken_at', { ascending: false })
        .limit(10)
      if (photosError) throw photosError
      const photos = (rawPhotos ?? []) as unknown as PhotoRow[]

      // Fetch recent assignments
      const { data: rawAssign, error: assignError } = await supabase
        .from('panel_campaigns')
        .select('id, assigned_at, panels(id, name, reference), campaigns(name), profiles(full_name)')
        .order('assigned_at', { ascending: false })
        .limit(10)
      if (assignError) throw assignError
      const assignments = (rawAssign ?? []) as unknown as AssignmentRow[]

      const PHOTO_LABELS: Record<string, string> = {
        installation: 'Installation',
        check: 'Vérification',
        campaign: 'Campagne',
        damage: 'Dégât',
      }

      const items: ActivityItem[] = [
        ...photos.map((p) => ({
          id: p.id,
          type: 'photo' as const,
          date: p.taken_at,
          panelName: p.panels?.name || p.panels?.reference || '—',
          panelId: p.panels?.id || '',
          userName: p.profiles?.full_name || null,
          detail: PHOTO_LABELS[p.photo_type] ?? p.photo_type,
        })),
        ...assignments.map((a) => ({
          id: a.id,
          type: 'assignment' as const,
          date: a.assigned_at,
          panelName: a.panels?.name || a.panels?.reference || '—',
          panelId: a.panels?.id || '',
          userName: a.profiles?.full_name || null,
          detail: a.campaigns?.name ?? '—',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return items.slice(0, 15)
    },
    staleTime: 60_000,
  })
}
