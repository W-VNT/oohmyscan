import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface UseQRScannerOptions {
  onScan: (decodedText: string) => void
  active?: boolean
}

export function useQRScanner({ onScan, active = true }: UseQRScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const start = useCallback(async (elementId: string) => {
    if (scannerRef.current) return

    try {
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(200)
          onScanRef.current(decodedText)
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      )
      setScanning(true)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Impossible d\'accéder à la caméra'
      setError(message)
      setScanning(false)
    }
  }, [])

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      stop()
    }
    return () => {
      stop()
    }
  }, [active, stop])

  return { start, stop, scanning, error }
}

/**
 * Extract panel ID from a scanned QR code value.
 * Supports formats:
 * - Full URL: https://app.oohmyscan.com/scan?id={uuid}
 * - Protocol: oohmyad://panel/{uuid}
 * - Raw UUID
 */
export function extractPanelId(scannedValue: string): string | null {
  // Try URL format
  try {
    const url = new URL(scannedValue)
    const id = url.searchParams.get('id')
    if (id) return id
  } catch {
    // Not a URL
  }

  // Try protocol format
  const protocolMatch = scannedValue.match(/oohmyad:\/\/panel\/(.+)/)
  if (protocolMatch) return protocolMatch[1]

  // Try raw UUID
  const uuidMatch = scannedValue.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  )
  if (uuidMatch) return uuidMatch[0]

  return null
}
