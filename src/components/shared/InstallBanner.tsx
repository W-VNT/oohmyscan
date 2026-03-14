import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download, X, Share, PlusSquare } from 'lucide-react'

export function InstallBanner() {
  const { pathname } = useLocation()
  const { canInstall, isInstalled, install, showIOSGuide } = usePWAInstall()
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('install-banner-dismissed') === 'true'
  })
  const [showingIOSGuide, setShowingIOSGuide] = useState(false)

  // Only show on login and app pages, not on landing or admin
  const showOnRoute = pathname === '/login' || pathname.startsWith('/app')
  if (!showOnRoute) return null
  if (isInstalled || dismissed) return null
  if (!canInstall && !showIOSGuide) return null

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('install-banner-dismissed', 'true')
  }

  async function handleInstall() {
    const accepted = await install()
    if (accepted) dismiss()
  }

  // iOS guide modal
  if (showingIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-8">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Installer OOHMYSCAN</h3>
            <button onClick={() => setShowingIOSGuide(false)} className="text-muted-foreground">
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Share className="size-4 text-blue-500" />
              </div>
              <p className="text-[13px]">
                Appuyez sur <span className="font-semibold">Partager</span> en bas de Safari
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                <PlusSquare className="size-4 text-blue-500" />
              </div>
              <p className="text-[13px]">
                Puis <span className="font-semibold">Sur l'écran d'accueil</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowingIOSGuide(false)}
            className="w-full rounded-xl bg-foreground py-3 text-[13px] font-medium text-background"
          >
            Compris
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
          <Download className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Installer OOHMYSCAN</p>
          <p className="text-[11px] text-muted-foreground">Accès rapide depuis l'accueil</p>
        </div>
        {canInstall ? (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background"
          >
            Installer
          </button>
        ) : showIOSGuide ? (
          <button
            onClick={() => setShowingIOSGuide(true)}
            className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background"
          >
            Comment ?
          </button>
        ) : null}
        <button onClick={dismiss} className="shrink-0 text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
