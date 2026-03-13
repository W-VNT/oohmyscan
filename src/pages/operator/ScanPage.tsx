import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Plus, Megaphone, Eye, RotateCcw } from 'lucide-react'
import { QRScanner } from '@/components/qr/QRScanner'
import { extractPanelId } from '@/hooks/useQRScanner'
import { usePanelByQrCode } from '@/hooks/usePanels'
import { supabase } from '@/lib/supabase'

type ScanMode = 'install' | 'campaign'

type AlertState = {
  type: 'warning' | 'info'
  title: string
  message: string
  actions: { label: string; icon: typeof Eye; onClick: () => void; primary?: boolean }[]
}

export function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode: ScanMode = (searchParams.get('mode') as ScanMode) || 'install'

  const [scannedId, setScannedId] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [checkingCampaign, setCheckingCampaign] = useState(false)

  const { data: existingPanel, isFetching } = usePanelByQrCode(scannedId ?? undefined)

  function resetScan() {
    setScannedId(null)
    setScanError(null)
    setAlert(null)
    setCheckingCampaign(false)
  }

  // Check for active campaign on a panel
  async function hasActiveCampaign(panelId: string): Promise<boolean> {
    const { data } = await supabase
      .from('panel_campaigns')
      .select('id')
      .eq('panel_id', panelId)
      .is('unassigned_at', null)
      .limit(1)
    return (data?.length ?? 0) > 0
  }

  // Route after scan based on mode + validation
  useEffect(() => {
    if (!scannedId || isFetching || existingPanel === undefined) return
    if (alert) return // Already showing an alert
    if (checkingCampaign) return

    async function route() {
      if (mode === 'install') {
        // Mode install : on veut créer un nouveau point
        if (!existingPanel) {
          // QR nouveau → OK, aller vers register
          navigate(`/app/register/${scannedId}`, { replace: true })
          return
        }

        // Le point existe déjà
        setCheckingCampaign(true)
        const hasCampaign = await hasActiveCampaign(existingPanel.id)
        setCheckingCampaign(false)

        if (hasCampaign) {
          setAlert({
            type: 'warning',
            title: 'Point déjà en campagne',
            message: 'Ce point est déjà installé et a une campagne en cours. Vous ne pouvez pas le réinstaller.',
            actions: [
              { label: 'Rescanner', icon: RotateCcw, onClick: resetScan },
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/app/panels/${existingPanel.id}`), primary: true },
            ],
          })
        } else {
          setAlert({
            type: 'info',
            title: 'Point déjà installé',
            message: 'Ce point existe déjà dans le système.',
            actions: [
              { label: 'Rescanner', icon: RotateCcw, onClick: resetScan },
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/app/panels/${existingPanel.id}`), primary: true },
            ],
          })
        }
      } else {
        // Mode campaign : on veut poser une affiche
        if (!existingPanel) {
          // QR nouveau → pas encore installé
          setAlert({
            type: 'warning',
            title: 'Point non installé',
            message: 'Ce point n\'est pas encore dans le système. Voulez-vous l\'installer d\'abord ?',
            actions: [
              { label: 'Rescanner', icon: RotateCcw, onClick: resetScan },
              { label: 'Installer ce point', icon: Plus, onClick: () => navigate(`/app/register/${scannedId}`), primary: true },
            ],
          })
          return
        }

        // Le point existe, vérifier s'il a déjà une campagne
        setCheckingCampaign(true)
        const hasCampaign = await hasActiveCampaign(existingPanel.id)
        setCheckingCampaign(false)

        if (hasCampaign) {
          setAlert({
            type: 'warning',
            title: 'Campagne déjà en cours',
            message: 'Ce point a déjà une campagne active. Vous ne pouvez pas en assigner une nouvelle.',
            actions: [
              { label: 'Rescanner', icon: RotateCcw, onClick: resetScan },
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/app/panels/${existingPanel.id}`), primary: true },
            ],
          })
        } else {
          // OK → assigner campagne
          navigate(`/app/assign/${existingPanel.id}`, { replace: true })
        }
      }
    }

    route()
  }, [scannedId, isFetching, existingPanel, mode, alert, checkingCampaign])

  const handleScan = useCallback((decodedText: string) => {
    const panelId = extractPanelId(decodedText)
    if (panelId) {
      setScannedId(panelId)
      setScanError(null)
      setAlert(null)
    } else {
      setScanError('QR Code non reconnu. Vérifiez qu\'il s\'agit d\'un panneau OOHMYAD.')
    }
  }, [])

  const isInstall = mode === 'install'

  const showCamera = !alert

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      {/* Fullscreen camera */}
      {showCamera && (
        <QRScanner onScan={handleScan} active={!scannedId} fullscreen />
      )}

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        {/* Top bar */}
        <div className="pointer-events-auto flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button onClick={() => navigate(-1)} className="flex size-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm" aria-label="Fermer le scanner">
            <ArrowLeft className="size-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-white">
              {isInstall ? 'Installer un point' : 'Diffuser une campagne'}
            </h1>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${
            isInstall
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            {isInstall ? <Plus className="size-3" /> : <Megaphone className="size-3" />}
            {isInstall ? 'Installation' : 'Diffusion'}
          </div>
        </div>

        {/* Center viewfinder */}
        {showCamera && (
          <div className="flex flex-1 items-center justify-center">
            <div className="pointer-events-none relative size-64">
              {/* Corner brackets */}
              <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/80" />
              <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/80" />
              <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/80" />
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/80" />
              {/* Scan line */}
              <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-white/40" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {(isFetching || checkingCampaign) && (
          <div className="pointer-events-auto mx-4 mb-4 rounded-xl bg-black/60 p-4 text-center text-sm text-white backdrop-blur-sm">
            Vérification du panneau...
          </div>
        )}

        {/* Scan error */}
        {scanError && (
          <div className="pointer-events-auto mx-4 mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-200 backdrop-blur-sm">
            {scanError}
          </div>
        )}

        {/* Alert / validation warning */}
        {alert && (
          <div className="pointer-events-auto mx-4 mt-auto mb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className={`rounded-xl border p-4 backdrop-blur-md ${
              alert.type === 'warning'
                ? 'border-orange-400/30 bg-orange-950/80 text-orange-100'
                : 'border-blue-400/30 bg-blue-950/80 text-blue-100'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${
                  alert.type === 'warning' ? 'text-orange-400' : 'text-blue-400'
                }`} />
                <div>
                  <p className="text-[14px] font-semibold">{alert.title}</p>
                  <p className="mt-1 text-[13px] opacity-80">{alert.message}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {alert.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-[13px] font-medium transition-colors ${
                    action.primary
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white backdrop-blur-sm'
                  }`}
                >
                  <action.icon className="size-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom hint */}
        {!alert && (
          <div className="pointer-events-none mt-auto bg-gradient-to-t from-black/60 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-center text-[13px] text-white/60">
              Placez le QR code dans le cadre
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
