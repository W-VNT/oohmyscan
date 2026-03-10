import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Megaphone, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  active: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  draft: 'Brouillon',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  draft: 'outline',
}

interface CampaignWithStats {
  id: string
  name: string
  client: string
  status: string
  start_date: string
  end_date: string
  myPanels: number
  totalPanels: number
}

export function MyCampaignsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns-list', session?.user.id],
    queryFn: async () => {
      // Get all campaigns where this operator has assigned panels
      const { data: assignments, error } = await supabase
        .from('panel_campaigns')
        .select('campaign_id')
        .eq('assigned_by', session!.user.id)
      if (error) throw error
      if (!assignments?.length) return []

      const campaignIds = [...new Set(assignments.map((a) => a.campaign_id))]

      const { data: campaignData, error: cErr } = await supabase
        .from('campaigns')
        .select('id, name, client, status, start_date, end_date')
        .in('id', campaignIds)
        .order('start_date', { ascending: false })
      if (cErr) throw cErr
      if (!campaignData?.length) return []

      // Count panels per campaign (total + mine)
      const results: CampaignWithStats[] = await Promise.all(
        campaignData.map(async (c) => {
          const [totalRes, myRes] = await Promise.all([
            supabase
              .from('panel_campaigns')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', c.id),
            supabase
              .from('panel_campaigns')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', c.id)
              .eq('assigned_by', session!.user.id),
          ])
          return {
            ...c,
            totalPanels: totalRes.count ?? 0,
            myPanels: myRes.count ?? 0,
          }
        }),
      )
      return results
    },
    enabled: !!session,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">Mes campagnes</h1>
      </div>

      <div className="space-y-3 p-4">
        {!campaigns?.length ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Megaphone className="size-8" strokeWidth={1} />
            <p className="mt-3 text-sm">Aucune campagne</p>
            <p className="text-[12px]">Vos campagnes apparaîtront ici</p>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const progress =
              campaign.totalPanels > 0
                ? Math.round((campaign.myPanels / campaign.totalPanels) * 100)
                : 0
            const isDone = campaign.myPanels >= campaign.totalPanels && campaign.totalPanels > 0
            const isActive = campaign.status === 'active'

            return (
              <Card key={campaign.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">{campaign.name}</p>
                      <p className="text-[12px] text-muted-foreground">{campaign.client}</p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANTS[campaign.status] ?? 'secondary'}
                      className="shrink-0 text-[10px]"
                    >
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold">
                        {campaign.myPanels}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{campaign.totalPanels}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">points posés</p>
                    </div>
                    {isDone && (
                      <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1">
                        <CheckCircle2 className="size-3 text-green-600" />
                        <span className="text-[11px] font-medium text-green-600">Terminé</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {isActive && (
                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isDone ? 'bg-green-500' : 'bg-primary',
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{progress}%</p>
                    </div>
                  )}

                  {/* Dates */}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(campaign.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' → '}
                    {new Date(campaign.end_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
