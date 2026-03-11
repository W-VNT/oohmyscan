import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface UseQRScannerOptions {
  containerId: string
  onScan: (decodedText: string) => void
  active?: boolean
}

export function useQRScanner({ containerId, onScan, active = true }: UseQRScannerOptions) {
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    let cancelled = false
    let scanner: Html5Qrcode | null = null

    async function init() {
      // Wait for DOM element
      await new Promise((r) => setTimeout(r, 200))
      if (cancelled) return

      try {
        scanner = new Html5Qrcode(containerId)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(200)
            onScanRef.current(decodedText)
          },
          () => {}
        )
        if (cancelled) {
          // StrictMode cleanup happened during start
          try { await scanner.stop(); scanner.clear() } catch {}
          return
        }
        setScanning(true)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Impossible d'accéder à la caméra")
        setScanning(false)
      }
    }

    init()

    return () => {
      cancelled = true
      setScanning(false)
      if (scanner) {
        scanner.stop().then(() => scanner!.clear()).catch(() => {})
      }
    }
  }, [active, containerId])

  return { scanning, error }
}

/**
 * Extract panel ID from a scanned QR code value.
 * Supports formats:
 * - Full URL: https://app.oohmyscan.com/scan?id={uuid}
 * - Protocol: oohmyad://panel/{uuid}
 * - Raw UUID
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

export function extractPanelId(scannedValue: string): string | null {
  // Try URL format
  try {
    const url = new URL(scannedValue)
    const id = url.searchParams.get('id')
    if (id && isValidUUID(id)) return id
  } catch {
    // Not a URL
  }

  // Try protocol format
  const protocolMatch = scannedValue.match(/oohmyad:\/\/panel\/([0-9a-f-]+)$/i)
  if (protocolMatch && isValidUUID(protocolMatch[1])) return protocolMatch[1]

  // Try raw UUID
  if (isValidUUID(scannedValue.trim())) return scannedValue.trim()

  return null
}
