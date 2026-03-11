import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

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
    let stream: MediaStream | null = null
    let rafId: number | null = null

    async function init() {
      // Wait for container to be in DOM
      await new Promise((r) => setTimeout(r, 100))
      if (cancelled) return

      const container = document.getElementById(containerId)
      if (!container) return

      try {
        // Request camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        // Create video element
        const video = document.createElement('video')
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.setAttribute('muted', 'true')
        video.muted = true
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'
        container.appendChild(video)

        await video.play()
        if (cancelled) return

        setScanning(true)
        setError(null)

        // Hidden canvas for frame analysis
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!

        let lastScanTime = 0

        function tick() {
          if (cancelled) return
          rafId = requestAnimationFrame(tick)

          // Scan at ~10fps
          const now = performance.now()
          if (now - lastScanTime < 100) return
          lastScanTime = now

          if (video.readyState < video.HAVE_ENOUGH_DATA) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })

          if (code?.data) {
            if (navigator.vibrate) navigator.vibrate(200)
            onScanRef.current(code.data)
          }
        }

        rafId = requestAnimationFrame(tick)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Impossible d'accéder à la caméra"
        // Friendlier error for common cases
        if (message.includes('NotAllowed') || message.includes('Permission')) {
          setError("Accès à la caméra refusé. Vérifiez les permissions dans Réglages.")
        } else {
          setError(message)
        }
        setScanning(false)
      }
    }

    init()

    return () => {
      cancelled = true
      setScanning(false)
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      // Clean up video from container
      const container = document.getElementById(containerId)
      if (container) {
        const video = container.querySelector('video')
        if (video) {
          video.srcObject = null
          video.remove()
        }
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
