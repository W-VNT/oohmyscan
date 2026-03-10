import { useEffect, useState } from 'react'
import QRCodeLib from 'qrcode'
import { Download, Loader2 } from 'lucide-react'

interface QRCodeProps {
  panelId: string
  size?: number
}

function getQRUrl(panelId: string) {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
  return `${appUrl}/scan?id=${panelId}`
}

export function QRCode({ panelId, size = 250 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCodeLib.toDataURL(getQRUrl(panelId), {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setDataUrl)
  }, [panelId, size])

  function handleDownload() {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `qr-${panelId}.png`
    link.href = dataUrl
    link.click()
  }

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <img src={dataUrl} alt="QR Code" width={size} height={size} className="rounded-lg" />
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <Download className="h-4 w-4" />
        Télécharger PNG
      </button>
    </div>
  )
}
