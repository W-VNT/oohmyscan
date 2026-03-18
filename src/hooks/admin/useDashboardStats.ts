import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CampaignWithClientName, PhotoWithJoins, AssignmentWithJoins } from '@/types'

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

      const rows = data as Pick<{ status: string }, 'status'>[]
      const stats: PanelStats = { total: 0, active: 0, vacant: 0, maintenance: 0, missing: 0 }
      for (const p of rows) {
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

      const rows = data as unknown as CampaignWithClientName[]

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

      const rows = data as Pick<{ status: string; total_ttc: number; paid_at: string | null }, 'status' | 'total_ttc' | 'paid_at'>[]
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const stats: InvoiceStats = {
        totalPaidTTC: 0, totalPaidCount: 0,
        totalSentTTC: 0, totalSentCount: 0,
        totalOverdueTTC: 0, totalOverdueCount: 0,
        monthPaidTTC: 0, monthPaidCount: 0,
      }

      for (const inv of rows) {
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

interface AgingBucket {
  label: string
  count: number
  amount: number
  color: string
}

interface TopClient {
  name: string
  amount: number
  count: number
}

interface MonthlyCA {
  month: string
  amount: number
}

interface FinanceStats {
  aging: AgingBucket[]
  quotePipeline: { count: number; totalTTC: number }
  topClients: TopClient[]
  monthlyCA: MonthlyCA[]
}

export function useFinanceStats() {
  return useQuery({
    queryKey: ['dashboard', 'finance-stats'],
    queryFn: async (): Promise<FinanceStats> => {
      // Fetch invoices for aging + monthly CA
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('status, total_ttc, due_at, paid_at, issued_at, client_id, clients(company_name)')
        .neq('status', 'cancelled')
      if (invErr) throw invErr

      // Fetch quotes for pipeline
      const { data: quotes, error: qErr } = await supabase
        .from('quotes')
        .select('status, total_ttc')
        .in('status', ['draft', 'sent'])
      if (qErr) throw qErr

      type InvRow = { status: string; total_ttc: number; due_at: string; paid_at: string | null; issued_at: string; client_id: string; clients: { company_name: string } | null }
      const invRows = (invoices ?? []) as unknown as InvRow[]
      const now = new Date()

      // --- Aging buckets ---
      const buckets = [
        { label: '0-30 jours', min: 0, max: 30, count: 0, amount: 0, color: 'bg-yellow-500' },
        { label: '30-60 jours', min: 30, max: 60, count: 0, amount: 0, color: 'bg-orange-500' },
        { label: '60-90 jours', min: 60, max: 90, count: 0, amount: 0, color: 'bg-red-400' },
        { label: '90+ jours', min: 90, max: Infinity, count: 0, amount: 0, color: 'bg-red-600' },
      ]

      for (const inv of invRows) {
        if (inv.status !== 'sent' && inv.status !== 'overdue') continue
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(inv.due_at).getTime()) / 86400000))
        for (const b of buckets) {
          if (daysOverdue >= b.min && daysOverdue < b.max) {
            b.count++
            b.amount += inv.total_ttc
            break
          }
        }
      }

      // --- Top clients by paid CA ---
      const clientMap = new Map<string, TopClient>()
      for (const inv of invRows) {
        if (inv.status !== 'paid') continue
        const name = inv.clients?.company_name ?? 'Inconnu'
        const existing = clientMap.get(name) ?? { name, amount: 0, count: 0 }
        existing.amount += inv.total_ttc
        existing.count++
        clientMap.set(name, existing)
      }
      const topClients = Array.from(clientMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // --- Monthly CA (6 last months) ---
      const monthlyCA: MonthlyCA[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = d.toISOString()
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
        let amount = 0
        for (const inv of invRows) {
          if (inv.status === 'paid' && inv.paid_at && inv.paid_at >= monthStart && inv.paid_at <= monthEnd) {
            amount += inv.total_ttc
          }
        }
        monthlyCA.push({
          month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          amount: Math.round(amount * 100) / 100,
        })
      }

      // --- Quote pipeline ---
      const quotePipeline = {
        count: quotes?.length ?? 0,
        totalTTC: (quotes ?? []).reduce((sum, q) => sum + ((q as { total_ttc: number }).total_ttc ?? 0), 0),
      }

      return {
        aging: buckets.map(({ label, count, amount, color }) => ({ label, count, amount: Math.round(amount * 100) / 100, color })),
        quotePipeline,
        topClients,
        monthlyCA,
      }
    },
    staleTime: 60_000,
  })
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
      const photos = (rawPhotos ?? []) as unknown as PhotoWithJoins[]

      // Fetch recent assignments
      const { data: rawAssign, error: assignError } = await supabase
        .from('panel_campaigns')
        .select('id, assigned_at, panels(id, name, reference), campaigns(name), profiles(full_name)')
        .order('assigned_at', { ascending: false })
        .limit(10)
      if (assignError) throw assignError
      const assignments = (rawAssign ?? []) as unknown as AssignmentWithJoins[]

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
