import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Megaphone, ArrowLeft, Loader2 } from 'lucide-react'

interface ScanMissionSheetProps {
  open: boolean
  onClose: () => void
}

export function ScanMissionSheet({ open, onClose }: ScanMissionSheetProps) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [showCampaigns, setShowCampaigns] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-active-campaigns-sheet', session?.user.id],
    queryFn: async () => {
      // Filtre : uniquement les campagnes actives assignees a l'operateur.
      // Split en 2 queries pour la perf (evite un double nested select lent).
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, name, client_id, clients(company_name)')
        .eq('status', 'active')
        .contains('operator_user_ids', [session!.user.id])
      if (error) throw error
      const rows = (campaigns ?? []) as unknown as Array<{
        id: string; name: string; client_id: string | null
        clients: { company_name: string } | null
      }>
      if (rows.length === 0) return []

      const campaignIds = rows.map((c) => c.id)
      const { data: visuals } = await supabase
        .from('campaign_visuals')
        .select('campaign_id, panel_formats(has_qr_code)')
        .in('campaign_id', campaignIds)

      // Regroupe : true si tous les visuels d'une campagne sont sans QR
      const depositByCampaign = new Map<string, boolean>()
      const seenByCampaign = new Map<string, { hasQr: boolean; noQr: boolean }>()
      for (const v of (visuals ?? []) as unknown as Array<{
        campaign_id: string
        panel_formats: { has_qr_code: boolean } | null
      }>) {
        if (!v.panel_formats) continue
        const s = seenByCampaign.get(v.campaign_id) ?? { hasQr: false, noQr: false }
        if (v.panel_formats.has_qr_code) s.hasQr = true
        else s.noQr = true
        seenByCampaign.set(v.campaign_id, s)
      }
      for (const [id, s] of seenByCampaign) {
        depositByCampaign.set(id, s.noQr && !s.hasQr)
      }

      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        client_id: c.client_id,
        clients: c.clients,
        isDeposit: depositByCampaign.get(c.id) ?? false,
      }))
    },
    enabled: !!session && open && showCampaigns,
    staleTime: 30_000,
  })

  if (!open) return null

  function handleClose() {
    setShowCampaigns(false)
    onClose()
  }

  function goInstall() {
    handleClose()
    navigate('/app/scan?mode=install')
  }

  function goCampaign(campaignId: string, isDeposit: boolean) {
    handleClose()
    // Campagne QR : scan classique. Campagne depot (sous-bocks) : wizard depot.
    if (isDeposit) {
      navigate(`/app/deposit/${campaignId}`)
    } else {
      navigate(`/app/scan?mode=campaign&campaign=${campaignId}`)
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-lg rounded-t-2xl bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          {!showCampaigns ? (
            /* Step 1: Choose mode */
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={goInstall}
                className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-5 transition-colors active:bg-muted/50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Plus className="size-5 text-blue-500" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium">Installer</span>
              </button>
              <button
                onClick={() => setShowCampaigns(true)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-5 transition-colors active:bg-muted/50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Megaphone className="size-5 text-emerald-500" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium">Diffuser</span>
              </button>
            </div>
          ) : (
            /* Step 2: Choose campaign */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCampaigns(false)}
                  className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <p className="text-[14px] font-semibold">Choisir une campagne</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : !campaigns?.length ? (
                <div className="py-6 text-center">
                  <Megaphone className="mx-auto size-6 text-muted-foreground" strokeWidth={1} />
                  <p className="mt-2 text-[13px] text-muted-foreground">Aucune campagne active</p>
                </div>
              ) : (
                <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => goCampaign(campaign.id, campaign.isDeposit)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors active:bg-muted/50"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <Megaphone className="size-3.5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{campaign.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{campaign.clients?.company_name ?? ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
