import { BRAND_BLACK, BRAND_RED, BRAND_WHITE, BRAND_NAME, BRAND_TAGLINE } from '@/lib/report-brand'
import { useBrandColor } from '@/lib/brand-color-context'
import { SLIDE_W } from './SlideCanvas'

/** Wave colore en bas de slide (cover, region intro, page merci). */
export function BottomRedWave() {
  const { red } = useBrandColor()
  return (
    <svg
      width={SLIDE_W}
      height={200}
      viewBox={`0 0 ${SLIDE_W} 200`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0 }}
    >
      <path
        d={`M0,80 C300,0 800,150 ${SLIDE_W},40 L${SLIDE_W},200 L0,200 Z`}
        fill={red}
      />
    </svg>
  )
}

/**
 * Logo marker : carre blanc/noir contenant un sous-carre rouge OOH.
 * Le logo NE CHANGE JAMAIS de couleur — c'est l'identite de la marque,
 * pas un accent themable.
 */
function BrandLogoMarker({ dark = false }: { dark?: boolean }) {
  const size = dark ? 24 : 28
  const inner = dark ? 12 : 14
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: dark ? BRAND_BLACK : BRAND_WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: inner, height: inner, backgroundColor: BRAND_RED }} />
    </div>
  )
}

/** Footer marque OOH MY AD ! centre en bas du wave. */
export function BrandFooter() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <BrandLogoMarker />
      <div>
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 24,
            color: BRAND_WHITE,
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          {BRAND_NAME}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 11,
            color: BRAND_WHITE,
            letterSpacing: '0.08em',
            marginTop: 3,
          }}
        >
          {BRAND_TAGLINE}
        </div>
      </div>
    </div>
  )
}

/** Badge avec ombre claire derriere, style Orange/Reporting. */
export function SectionBadge({
  label,
  width = 380,
  fontSize = 28,
}: {
  label: string
  width?: number
  fontSize?: number
}) {
  const { red, redLight } = useBrandColor()
  return (
    <div style={{ position: 'relative', display: 'inline-block', width }}>
      {/* Ombre claire decalee */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width,
          height: 70,
          backgroundColor: redLight,
        }}
      />
      {/* Badge principal */}
      <div
        style={{
          position: 'relative',
          width,
          height: 70,
          backgroundColor: red,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize,
            color: BRAND_WHITE,
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

/** Numero de page (couleur de marque) en bas a droite. */
export function PageNumber({ n }: { n: number }) {
  const { red } = useBrandColor()
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        right: 36,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 900,
        fontSize: 24,
        color: red,
        lineHeight: 1,
      }}
    >
      {n}
    </div>
  )
}

/** Variante : footer marque NOIR (utilise sur les pages sans wave colore). */
export function BrandFooterDark() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <BrandLogoMarker dark />
      <div>
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 20,
            color: BRAND_BLACK,
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          {BRAND_NAME}
        </div>
      </div>
    </div>
  )
}
