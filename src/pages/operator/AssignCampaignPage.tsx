import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, Megaphone } from 'lucide-react'
import { usePanel } from '@/hooks/usePanels'
import { useActiveCampaigns, useAssignCampaign } from '@/hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/shared/Toast'
import { useAuth } from '@/hooks/useAuth'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { supabase } from '@/lib/supabase'
import type { PanelStatus } from '@/lib/constants'

export function AssignCampaignPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: panel, isLoading: panelLoading } = usePanel(panelId)
  const { data: campaigns, isLoading: campaignsLoading } = useActiveCampaigns()
  const assignCampaign = useAssignCampaign()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (panelLoading || campaignsLoading) return <LoadingScreen />

  if (!panel) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium">Panneau non trouvé</p>
          <button
            onClick={() => navigate('/app/scan')}
            className="mt-4 text-sm text-primary underline"
          >
            Retour au scanner
          </button>
        </div>
      </div>
    )
  }

  async function handleConfirm() {
    if (!selectedCampaignId || !photoPath || !panelId) return

    setSubmitting(true)
    setError(null)

    try {
      await assignCampaign.mutateAsync({
        panel_id: panelId,
        campaign_id: selectedCampaignId,
        assigned_by: session?.user?.id,
        validation_photo_path: photoPath,
        validated_at: new Date().toISOString(),
      })

      // Also save the validation photo as a panel_photo so it appears in the panel's photo gallery
      await supabase.from('panel_photos').insert({
        panel_id: panelId,
        storage_path: photoPath,
        photo_type: 'campaign',
        taken_by: session?.user?.id,
        taken_at: new Date().toISOString(),
      })

      await supabase
        .from('panels')
        .update({
          status: 'active',
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', panelId)

      // Re-invalidate after direct supabase calls (photo insert + panel status update)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['panels'] }),
        queryClient.invalidateQueries({ queryKey: ['panel-photos', panelId] }),
        queryClient.invalidateQueries({ queryKey: ['panel-assignments', panelId] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-visual'] }),
      ])

      toast('Campagne assignée avec succès')
      navigate(`/app/panels/${panelId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'assignation')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : navigate(-1))} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Assigner une campagne</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-1 px-4 pt-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Panel info */}
      <div className="mx-4 mt-4 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{panel.locations?.name || panel.name || 'Panneau'}</p>
            <p className="text-sm text-muted-foreground">
              {panel.zone_label ? `${panel.zone_label} · ${panel.city}` : (panel.city || panel.address || '—')}
            </p>
          </div>
          <StatusBadge status={panel.status as PanelStatus} />
        </div>
      </div>

      <div className="p-4">
        {/* Step 1: Select campaign */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Sélectionnez une campagne</p>
            {!campaigns?.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne active disponible.
              </p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => {
                      setSelectedCampaignId(campaign.id)
                      setStep(2)
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedCampaignId === campaign.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.client}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                          {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Validation photo */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Photo de validation</p>
              <p className="text-sm text-muted-foreground">
                Prenez une photo de la pose de l'affiche
              </p>
            </div>
            <PhotoCapture
              folder={`panels/${panelId}/campaigns`}
              onPhotoUploaded={(path) => {
                setPhotoPath(path)
                setStep(3)
              }}
            />
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium">Récapitulatif</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Panneau</span>
                  <span className="font-medium">{panel.locations?.name || panel.name || 'Panneau'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campagne</span>
                  <span className="font-medium">{selectedCampaign?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span>{selectedCampaign?.client}</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Photo de validation prise
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assignation...
                </>
              ) : (
                'Confirmer la pose'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
