import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Keyboard, AlertTriangle, ArrowLeft, Plus, Megaphone, Eye, RotateCcw } from 'lucide-react'
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
  const [manualInput, setManualInput] = useState(false)
  const [manualRef, setManualRef] = useState('')
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
          navigate(`/register/${scannedId}`, { replace: true })
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
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/panels/${existingPanel.id}`), primary: true },
            ],
          })
        } else {
          setAlert({
            type: 'info',
            title: 'Point déjà installé',
            message: 'Ce point existe déjà dans le système.',
            actions: [
              { label: 'Rescanner', icon: RotateCcw, onClick: resetScan },
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/panels/${existingPanel.id}`), primary: true },
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
              { label: 'Installer ce point', icon: Plus, onClick: () => navigate(`/register/${scannedId}`), primary: true },
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
              { label: 'Voir la fiche', icon: Eye, onClick: () => navigate(`/panels/${existingPanel.id}`), primary: true },
            ],
          })
        } else {
          // OK → assigner campagne
          navigate(`/assign/${existingPanel.id}`, { replace: true })
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

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualRef.trim()) {
      setScannedId(manualRef.trim())
    }
  }

  const isInstall = mode === 'install'

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">
            {isInstall ? 'Installer un point' : 'Diffuser une campagne'}
          </h1>
          <p className="text-[12px] text-muted-foreground">
            {isInstall
              ? 'Scannez le QR du nouveau panneau'
              : 'Scannez le QR du panneau existant'}
          </p>
        </div>
      </div>

      {/* Mode badge */}
      <div className="px-4 pb-3">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
          isInstall
            ? 'bg-blue-500/10 text-blue-600'
            : 'bg-emerald-500/10 text-emerald-600'
        }`}>
          {isInstall ? <Plus className="size-3" /> : <Megaphone className="size-3" />}
          {isInstall ? 'Mode installation' : 'Mode diffusion'}
        </div>
      </div>

      {/* Scanner */}
      {!manualInput && !alert && (
        <div className="px-4">
          <QRScanner onScan={handleScan} active={!scannedId} />
        </div>
      )}

      {/* Loading state */}
      {(isFetching || checkingCampaign) && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Vérification du panneau...
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="mx-4 mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {scanError}
        </div>
      )}

      {/* Alert / validation warning */}
      {alert && (
        <div className="mx-4 mt-4 space-y-3">
          <div className={`rounded-xl border p-4 ${
            alert.type === 'warning'
              ? 'border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10'
              : 'border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${
                alert.type === 'warning' ? 'text-orange-500' : 'text-blue-500'
              }`} />
              <div>
                <p className={`text-[14px] font-semibold ${
                  alert.type === 'warning' ? 'text-orange-900 dark:text-orange-200' : 'text-blue-900 dark:text-blue-200'
                }`}>
                  {alert.title}
                </p>
                <p className={`mt-1 text-[13px] ${
                  alert.type === 'warning' ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {alert.actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-[13px] font-medium transition-colors ${
                  action.primary
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-background text-foreground'
                }`}
              >
                <action.icon className="size-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual input fallback */}
      {!alert && (
        <div className="mt-auto p-4">
          {manualInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="UUID ou référence du panneau"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Rechercher
                </button>
                <button
                  type="button"
                  onClick={() => setManualInput(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setManualInput(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              <Keyboard className="h-4 w-4" />
              Saisie manuelle
            </button>
          )}
        </div>
      )}
    </div>
  )
}
