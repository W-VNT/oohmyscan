import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Megaphone, QrCode, Package, MapPin, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import { useDiffuseCampaigns, type CampaignWorkflow } from '@/hooks/useDiffuseCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { EmptyState } from '@/components/shared/EmptyState'

export function DiffusePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session?.user?.id
  const { data: campaigns, isLoading } = useDiffuseCampaigns(userId)

  function handleSelect(campaign: { id: string; workflow: CampaignWorkflow }) {
    switch (campaign.workflow) {
      case 'deposit':
        navigate(`/app/deposit/${campaign.id}`)
        return
      case 'free_panel':
        navigate(`/app/free-panel/${campaign.id}`)
        return
      case 'qr':
      case 'mixed':
      default:
        navigate(`/app/scan?mode=campaign&campaign=${campaign.id}`)
        return
    }
  }

  // Chip + label + icon selon workflow
  function workflowMeta(w: CampaignWorkflow) {
    if (w === 'deposit') return { bg: 'bg-emerald-500/10', icon: Package, iconColor: 'text-emerald-600', label: 'Dépôt — pas de scan QR', labelColor: 'text-emerald-700 dark:text-emerald-400' }
    if (w === 'free_panel') return { bg: 'bg-orange-500/10', icon: MapPin, iconColor: 'text-orange-600', label: 'Panneau libre — pose sur lieu', labelColor: 'text-orange-700 dark:text-orange-400' }
    if (w === 'mixed') return { bg: 'bg-purple-500/10', icon: QrCode, iconColor: 'text-purple-600', label: 'Campagne mixte', labelColor: 'text-purple-700 dark:text-purple-400' }
    return { bg: 'bg-blue-500/10', icon: QrCode, iconColor: 'text-blue-600', label: 'Pose avec scan QR', labelColor: 'text-blue-700 dark:text-blue-400' }
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Retour" className="rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">Diffuser une campagne</h1>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !campaigns?.length ? (
          <EmptyState
            icon={Megaphone}
            title="Aucune campagne à diffuser"
            description="Aucune campagne active ne t'est assignée pour le moment. Contacte l'admin si tu pensais en avoir une."
          />
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const meta = workflowMeta(c.workflow)
              const Icon = meta.icon
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
                >
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                    <Icon className={`size-5 ${meta.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.clients?.company_name && (
                      <p className="truncate text-xs text-muted-foreground">{c.clients.company_name}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(c.start_date).toLocaleDateString('fr-FR')}
                        {' → '}
                        {c.end_date ? new Date(c.end_date).toLocaleDateString('fr-FR') : 'en cours'}
                      </span>
                      {c.formats.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
                          {c.formats.map((f) => f.name).join(', ')}
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-[11px] font-medium ${meta.labelColor}`}>
                      {meta.label}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        )}

        {/* Lien retour explicite */}
        <div className="mt-6 text-center">
          <Link to="/app/dashboard" className="text-xs text-muted-foreground underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
