import { useEffect, useRef } from 'react'
import { useQRScanner } from '@/hooks/useQRScanner'
import { AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (decodedText: string) => void
  active?: boolean
}

export function QRScanner({ onScan, active = true }: QRScannerProps) {
  const containerId = 'qr-reader'
  const initialized = useRef(false)
  const { start, scanning, error } = useQRScanner({ onScan, active })

  useEffect(() => {
    if (active && !initialized.current) {
      initialized.current = true
      // Small delay to ensure DOM element exists
      const timer = setTimeout(() => start(containerId), 100)
      return () => clearTimeout(timer)
    }
  }, [active, start])

  return (
    <div className="relative w-full">
      <div
        id={containerId}
        className="overflow-hidden rounded-xl"
        style={{ minHeight: 300 }}
      />

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Erreur caméra</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {scanning && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-2xl border-2 border-primary/50" />
        </div>
      )}
    </div>
  )
}
