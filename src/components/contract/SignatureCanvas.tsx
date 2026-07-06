import { useRef, useEffect, useCallback } from 'react'
import { Eraser } from 'lucide-react'

interface SignatureCanvasProps {
  label: string
  onSignature: (dataUrl: string) => void
  value?: string
}

export function SignatureCanvas({ label, onSignature, value }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  // Setup canvas and handle resize
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    // Resolution 1.5x pour un compromis crispness / RAM (avant : 2x).
    // Sur telephone bas de gamme, 2x sur un canvas 400x150 -> 800x300px
    // 4 canaux, la conversion en base64 explose la RAM.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Fond blanc obligatoire pour JPEG (pas de transparence, ecraserait tout en noir)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Style
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx

    // If value provided, redraw it
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        hasDrawnRef.current = true
      }
      img.src = value
    }
  }, [value])

  useEffect(() => {
    setupCanvas()

    const observer = new ResizeObserver(() => {
      setupCanvas()
    })
    if (canvasRef.current) {
      observer.observe(canvasRef.current)
    }
    return () => observer.disconnect()
  }, [setupCanvas])

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const ctx = ctxRef.current
    if (!ctx) return

    isDrawingRef.current = true
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const ctx = ctxRef.current
    if (!ctx) return

    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    hasDrawnRef.current = true
  }, [getPos])

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas || !hasDrawnRef.current) return
    // JPEG 0.7 au lieu de PNG : -60% de taille (~30-50KB vs 100-150KB) sans
    // perte visible de qualite pour une signature. Cle pour tenir en RAM
    // sur telephones bas de gamme.
    onSignature(canvas.toDataURL('image/jpeg', 0.7))
  }, [onSignature])

  function clear() {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!ctx || !canvas) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    // Re-remplit fond blanc apres clear (evite qu'un JPEG partiel sorte noir)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    hasDrawnRef.current = false
    onSignature('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Eraser className="size-3" />
          Effacer
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border-2 border-dashed border-border bg-white">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Signez dans le cadre ci-dessus
      </p>
    </div>
  )
}
