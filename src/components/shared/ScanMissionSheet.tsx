import { useNavigate } from 'react-router-dom'
import { Plus, Megaphone } from 'lucide-react'

interface ScanMissionSheetProps {
  open: boolean
  onClose: () => void
}

export function ScanMissionSheet({ open, onClose }: ScanMissionSheetProps) {
  const navigate = useNavigate()

  if (!open) return null

  function go(mode: 'install' | 'campaign') {
    onClose()
    navigate(`/scan?mode=${mode}`)
  }

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-lg rounded-t-2xl bg-background px-4 pb-8 pt-3">
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => go('install')}
              className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-5 transition-colors active:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                <Plus className="size-5 text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-medium">Installer</span>
            </button>
            <button
              onClick={() => go('campaign')}
              className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-5 transition-colors active:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Megaphone className="size-5 text-emerald-500" strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-medium">Diffuser</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
