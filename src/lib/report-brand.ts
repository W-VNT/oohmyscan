/**
 * Constantes de marque pour le rapport campagne.
 * Centralise couleurs, fonts, dimensions A4 pour rester coherent
 * entre le rendu editeur (HTML) et l'export PDF (@react-pdf).
 */

/** Rouge principal OOH MY AD ! (badge, wave, accents). Defaut, peut etre override par rapport. */
export const BRAND_RED = '#EF4444'

/** Rouge clair derive du principal (ombre derriere badge, accents secondaires). */
export const BRAND_RED_LIGHT = '#FCA5A5'

/** Rouge tres clair (background subtil de section). */
export const BRAND_RED_PALE = '#FEE2E2'

/** Presets de couleurs disponibles pour le rapport. */
export const BRAND_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Rouge OOH', value: '#EF4444' },
  { label: 'Orange',    value: '#F97316' },
  { label: 'Jaune',     value: '#EAB308' },
  { label: 'Vert',      value: '#10B981' },
  { label: 'Bleu',      value: '#3B82F6' },
  { label: 'Indigo',    value: '#6366F1' },
  { label: 'Violet',    value: '#8B5CF6' },
  { label: 'Rose',      value: '#EC4899' },
  { label: 'Noir',      value: '#0A0A0A' },
]

/**
 * Eclaircit une couleur hex en melangeant avec du blanc.
 * amount entre 0 (couleur originale) et 1 (blanc pur).
 * Utilise pour deriver la variante "light" (ombre badge) a partir de la couleur principale.
 */
export function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const h = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

/**
 * Derive une palette (red + redLight + redPale) a partir d'une couleur unique.
 * Utilise par le rapport campagne pour theming.
 */
export function deriveBrandPalette(baseHex: string): {
  red: string
  redLight: string
  redPale: string
} {
  return {
    red: baseHex,
    redLight: lightenHex(baseHex, 0.55),
    redPale: lightenHex(baseHex, 0.85),
  }
}

/** Texte titre noir profond. */
export const BRAND_BLACK = '#0A0A0A'

/** Texte secondaire. */
export const BRAND_GRAY = '#525252'

/** Background slide. */
export const BRAND_WHITE = '#FFFFFF'

/** Dimensions A4 paysage en points (pt) pour @react-pdf. 1pt = 1/72 inch. */
export const A4_LANDSCAPE_PT = { width: 842, height: 595 } // 297mm x 210mm

/** Ratio A4 paysage utilise pour le scaling HTML editor. */
export const A4_LANDSCAPE_RATIO = A4_LANDSCAPE_PT.width / A4_LANDSCAPE_PT.height // ~1.414

/** Couleur pin Mapbox (sans #). */
export const PIN_COLOR_HEX = 'EF4444'

/** Nom de la marque utilise partout. */
export const BRAND_NAME = 'OOH MY AD !'

/** Sous-titre marque. */
export const BRAND_TAGLINE = 'MÉDIA DU DERNIER MÈTRE'
