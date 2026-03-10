import { ScanLine } from 'lucide-react'

export function ScanPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="rounded-2xl border-2 border-dashed border-border p-12">
        <ScanLine className="h-16 w-16 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">Scanner un QR Code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pointez la caméra vers le QR code du panneau
        </p>
      </div>
    </div>
  )
}
