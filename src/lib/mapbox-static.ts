/**
 * Mapbox Static Images API helper.
 * Genere des URLs d'images PNG/JPG avec pins, utilises dans les rapports campagne.
 *
 * Doc : https://docs.mapbox.com/api/maps/static-images/
 *
 * Limites cles :
 * - URL max ~16k chars (Mapbox)
 * - Charge gratuite : 50k requetes / mois
 * - Pin format : pin-s+COLOR(lng,lat) ou pin-l+COLOR(lng,lat) (small / large)
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/** Couleur des pins par defaut (rouge OOH MY AD !). Hex sans #. */
const PIN_COLOR_DEFAULT = 'EF4444'

/** Style Mapbox par defaut. light-v11 = sobre, pins ressortent, ideal pour rapports B2B. */
export const STYLE_DEFAULT = 'mapbox/light-v11'

/** Styles disponibles pour le selecteur dans l'editeur de rapport. */
export const MAP_STYLES: { value: string; label: string; description: string }[] = [
  { value: 'mapbox/light-v11',     label: 'Sobre',     description: 'Gris-blanc minimaliste, pins tres visibles' },
  { value: 'mapbox/streets-v12',   label: 'Standard',  description: 'Carte routiere classique coloree' },
  { value: 'mapbox/outdoors-v12',  label: 'Outdoor',   description: 'Reliefs et terrain (camping, nature)' },
  { value: 'mapbox/dark-v11',      label: 'Sombre',    description: 'Mode nuit, look tech moderne' },
  { value: 'mapbox/satellite-streets-v12', label: 'Satellite', description: 'Vue aerienne avec labels' },
]

export interface StaticMapOptions {
  /** Largeur en pixels (max 1280). */
  width?: number
  /** Hauteur en pixels (max 1280). */
  height?: number
  /** Echelle haute resolution (Retina). True = @2x. */
  retina?: boolean
  /** Couleur hex sans # (ex: 'EF4444'). */
  pinColor?: string
  /** Taille des pins : 's' (small) ou 'l' (large). */
  pinSize?: 's' | 'l'
  /** Style Mapbox. Defaut: streets-v12. */
  style?: string
  /** Nombre max de pins. Au-dela : echantillonnage uniforme. */
  maxPins?: number
}

/**
 * Construit une URL Mapbox Static avec pins automatiquement cadrees (auto-fit)
 * sur l'ensemble des points fournis.
 *
 * Retourne null si VITE_MAPBOX_TOKEN absent ou aucun point.
 */
export function buildStaticMapUrl(
  points: Array<{ lat: number; lng: number }>,
  options: StaticMapOptions = {},
): string | null {
  if (!MAPBOX_TOKEN) return null
  if (points.length === 0) return null

  const {
    width = 1000,
    height = 700,
    retina = true,
    pinColor = PIN_COLOR_DEFAULT,
    pinSize = 's',
    style = STYLE_DEFAULT,
    maxPins = 100,
  } = options

  // Echantillonage uniforme si trop de points
  const sampledPoints = samplePoints(points, maxPins)

  // Construit la chaine pins : pin-s+EF4444(lng,lat),pin-s+EF4444(lng,lat),...
  const pinsString = sampledPoints
    .map((p) => `pin-${pinSize}+${pinColor}(${p.lng.toFixed(5)},${p.lat.toFixed(5)})`)
    .join(',')

  const retinaSuffix = retina ? '@2x' : ''
  // auto = Mapbox calcule le cadrage pour englober tous les pins
  return `https://api.mapbox.com/styles/v1/${style}/static/${pinsString}/auto/${width}x${height}${retinaSuffix}?access_token=${MAPBOX_TOKEN}`
}

/** Echantillonne uniformement un tableau (garde max N points). */
function samplePoints<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  const result: T[] = []
  for (let i = 0; i < max; i++) {
    result.push(arr[Math.floor(i * step)])
  }
  return result
}

/**
 * Calcule le centre geographique d'un ensemble de points.
 * Utile pour generer un lien Google Maps cliquable centre sur la zone.
 */
export function computeCenter(
  points: Array<{ lat: number; lng: number }>,
): { lat: number; lng: number } | null {
  if (points.length === 0) return null
  const sumLat = points.reduce((s, p) => s + p.lat, 0)
  const sumLng = points.reduce((s, p) => s + p.lng, 0)
  return { lat: sumLat / points.length, lng: sumLng / points.length }
}

/**
 * Construit un lien Google Maps centre sur le bary des points et zoom adapte.
 * Utile pour le bouton "Cliquez ici pour voir le detail" du rapport.
 */
export function buildGoogleMapsLink(
  points: Array<{ lat: number; lng: number }>,
): string | null {
  const center = computeCenter(points)
  if (!center) return null
  // Zoom 8 = vue regionale
  return `https://www.google.com/maps/@${center.lat},${center.lng},8z`
}
