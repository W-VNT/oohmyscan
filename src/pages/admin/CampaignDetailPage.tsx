import { useParams, Link } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PanelTop, FileText } from 'lucide-react'
import type { PanelStatus } from '@/lib/constants'
import type { CampaignStatus } from '@/lib/constants'

const statusLabels: Record<CampaignStatus, string> = {
  draft: 'Brouillon',
  active: 'Active',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: campaign, isLoading } = useCampaign(id)
  const queryClient = useQueryClient()

  const { data: assignments } = useQuery({
    queryKey: ['campaign-panels', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(id, reference, name, status)')
        .eq('campaign_id', id!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const updateStatus = useMutation({
    mutationFn: async (status: CampaignStatus) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })

  if (isLoading) return <LoadingScreen />

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Campagne non trouvée</p>
        <Link to="/admin/campaigns" className="mt-4 text-sm text-primary underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/campaigns"
            className="rounded-md p-1 transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{campaign.name}</h2>
            <p className="mt-1 text-muted-foreground">{campaign.client}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Détails</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="mt-1 text-sm font-medium">
                  {statusLabels[campaign.status as CampaignStatus]}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Période</p>
                <p className="mt-1 text-sm">
                  {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            {campaign.description && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 text-sm">{campaign.description}</p>
              </div>
            )}
          </div>

          {/* Assigned panels */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <PanelTop className="h-4 w-4" />
              <h3 className="font-semibold">
                Panneaux assignés ({assignments?.length ?? 0})
              </h3>
            </div>
            {!assignments?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aucun panneau assigné à cette campagne
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assignments.map((a) => {
                  const panel = (a as Record<string, unknown>).panels as {
                    id: string
                    reference: string
                    name: string | null
                    status: string
                  } | null
                  return (
                    <div key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link
                          to={`/admin/panels/${panel?.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {panel?.reference ?? '—'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {panel?.name || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {panel && (
                          <StatusBadge status={panel.status as PanelStatus} />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.assigned_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">Actions</h3>
            <div className="space-y-2">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => updateStatus.mutate('active')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Activer la campagne
                </button>
              )}
              {campaign.status === 'active' && (
                <button
                  onClick={() => updateStatus.mutate('completed')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Marquer terminée
                </button>
              )}
              {(campaign.status === 'draft' || campaign.status === 'active') && (
                <button
                  onClick={() => updateStatus.mutate('cancelled')}
                  disabled={updateStatus.isPending}
                  className="w-full rounded-md border border-input px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-accent disabled:opacity-50"
                >
                  Annuler la campagne
                </button>
              )}
              {(campaign.status === 'active' || campaign.status === 'completed') && (
                <Link
                  to={`/admin/reports/${id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <FileText className="size-4" />
                  Proof of Posting
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
