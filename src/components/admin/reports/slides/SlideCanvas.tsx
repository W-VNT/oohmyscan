import type { CSSProperties, ReactNode } from 'react'
import { BRAND_WHITE } from '@/lib/report-brand'

/**
 * Canvas A4 paysage virtuel de 1414x1000 pixels.
 * Tout le contenu interne est positionne en pixels relatifs a ce canvas,
 * puis l'ensemble est mis a l'echelle via CSS transform.
 *
 * Utilise par les thumbnails (scale 0.15) ET la preview principale (scale ~0.65)
 * sans dupliquer le code de mise en page.
 */
export const SLIDE_W = 1414
export const SLIDE_H = 1000

interface Props {
  children: ReactNode
  scale?: number
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function SlideCanvas({ children, scale = 1, className, style, onClick }: Props) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        width: SLIDE_W * scale,
        height: SLIDE_H * scale,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: BRAND_WHITE,
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  )
}
