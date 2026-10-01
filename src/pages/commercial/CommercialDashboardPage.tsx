import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText, Plus, TrendingUp, Hourglass, Percent, ChevronRight } from 'lucide-react'
import { QUOTE_STATUS_CONFIG, type QuoteStatus } from '@/lib/constants'

interface DashboardQuote {
  id: string
  quote_number: string
  status: QuoteStatus
  total_ht: number
  issued_at: string
  clients: { company_name: string } | null
}

const STATUS_ORDER: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'converted']

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export function CommercialDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  // La RLS limite automatiquement aux devis du commercial connecte
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['commercial-dashboard-quotes', profile?.id],
    queryFn: async (): Promise<DashboardQuote[]> => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, status, total_ht, issued_at, clients(company_name)')
        .order('issued_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as DashboardQuote[]
    },
    enabled: !!profile,
  })

  const kpis = useMemo(() => {
    const list = quotes ?? []
    const byStatus = new Map<QuoteStatus, number>()
    let signed = 0
    let pipeline = 0
    for (const q of list) {
      byStatus.set(q.status, (byStatus.get(q.status) ?? 0) + 1)
      if (q.status === 'accepted' || q.status === 'converted') signed += Number(q.total_ht) || 0
      if (q.status === 'sent') pipeline += Number(q.total_ht) || 0
    }
    const won = (byStatus.get('accepted') ?? 0) + (byStatus.get('converted') ?? 0)
    // Base : devis sortis du brouillon (hors annules)
    const decidedOrPending = won + (byStatus.get('sent') ?? 0) + (byStatus.get('rejected') ?? 0)
    const conversion = decidedOrPending > 0 ? Math.round((won / decidedOrPending) * 100) : null
    return { byStatus, signed, pipeline, conversion }
  }, [quotes])

  const recent = (quotes ?? []).slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour,</p>
          <h1 className="text-xl font-semibold">{profile?.full_name}</h1>
        </div>
        <Button size="sm" onClick={() => navigate('/commercial/quotes/new')}>
          <Plus className="mr-1.5 size-3.5" /> Nouveau devis
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={TrendingUp}
          color="text-green-600 bg-green-500/10"
          label="CA signé"
          hint="Devis acceptés et convertis (HT)"
          value={isLoading ? null : formatCurrency(kpis.signed)}
        />
        <KpiCard
          icon={Hourglass}
          color="text-blue-600 bg-blue-500/10"
          label="Pipeline"
          hint="Devis envoyés en attente (HT)"
          value={isLoading ? null : formatCurrency(kpis.pipeline)}
        />
        <KpiCard
          icon={Percent}
          color="text-purple-600 bg-purple-500/10"
          label="Taux de conversion"
          hint="Devis signés / devis envoyés"
          value={isLoading ? null : kpis.conversion === null ? '—' : `${kpis.conversion} %`}
        />
      </div>

      {/* Devis par statut */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mes devis par statut</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STATUS_ORDER.map((status) => (
              <Link
                key={status}
                to="/commercial/quotes"
                className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                {isLoading ? (
                  <Skeleton className="h-8 w-8" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums">{kpis.byStatus.get(status) ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">{QUOTE_STATUS_CONFIG[status].label}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Derniers devis */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Derniers devis</h2>
            <Link to="/commercial/quotes" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              Tout voir <ChevronRight className="size-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis pour le moment"
              size="compact"
              action={{ label: 'Créer mon premier devis', onClick: () => navigate('/commercial/quotes/new') }}
            />
          ) : (
            <div className="space-y-2">
              {recent.map((q) => (
                <Link
                  key={q.id}
                  to={`/commercial/quotes/${q.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q.quote_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.clients?.company_name ?? '—'} · {new Date(q.issued_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(Number(q.total_ht) || 0)}</span>
                    <Badge variant={QUOTE_STATUS_CONFIG[q.status]?.variant ?? 'secondary'} className={QUOTE_STATUS_CONFIG[q.status]?.className}>
                      {QUOTE_STATUS_CONFIG[q.status]?.label ?? q.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ icon: Icon, color, label, hint, value }: {
  icon: typeof TrendingUp
  color: string
  label: string
  hint: string
  value: string | null
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          {value === null ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}
