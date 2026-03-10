import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard } from 'lucide-react'
import { QRScanner } from '@/components/qr/QRScanner'
import { extractPanelId } from '@/hooks/useQRScanner'
import { usePanelByQrCode } from '@/hooks/usePanels'

export function ScanPage() {
  const navigate = useNavigate()
  const [scannedId, setScannedId] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState(false)
  const [manualRef, setManualRef] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)

  const { data: existingPanel, isFetching } = usePanelByQrCode(scannedId ?? undefined)

  // Redirect once we know if panel exists or not
  if (scannedId && !isFetching && existingPanel !== undefined) {
    if (existingPanel) {
      navigate(`/assign/${existingPanel.id}`)
    } else {
      navigate(`/register/${scannedId}`)
    }
  }

  const handleScan = useCallback((decodedText: string) => {
    const panelId = extractPanelId(decodedText)
    if (panelId) {
      setScannedId(panelId)
      setScanError(null)
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Header */}
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold">Scanner un panneau</h1>
        <p className="text-sm text-muted-foreground">
          Pointez la caméra vers le QR code
        </p>
      </div>

      {/* Scanner */}
      {!manualInput && (
        <div className="px-4">
          <QRScanner onScan={handleScan} active={!scannedId} />
        </div>
      )}

      {/* Loading state */}
      {isFetching && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Recherche du panneau...
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="mx-4 mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {scanError}
        </div>
      )}

      {/* Manual input fallback */}
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
    </div>
  )
}
