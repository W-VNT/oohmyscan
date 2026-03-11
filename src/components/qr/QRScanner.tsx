import { useQRScanner } from '@/hooks/useQRScanner'
import { AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (decodedText: string) => void
  active?: boolean
  fullscreen?: boolean
}

export function QRScanner({ onScan, active = true, fullscreen = false }: QRScannerProps) {
  const { error } = useQRScanner({
    containerId: 'qr-reader',
    onScan,
    active,
  })

  return (
    <>
      <div
        id="qr-reader"
        className={fullscreen ? 'absolute inset-0' : 'relative w-full overflow-hidden rounded-xl'}
        style={fullscreen ? undefined : { minHeight: 300 }}
      />

      {error && (
        <div className={`flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground ${
          fullscreen ? 'absolute bottom-20 left-4 right-4 z-20' : 'mt-4'
        }`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Erreur caméra</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </>
  )
}
