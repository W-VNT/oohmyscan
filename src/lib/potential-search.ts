const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location,places.types'

/** Max radius per sub-query (meters). Google returns max 20 results per call. */
const SUB_RADIUS_M = 2000

/** Support types with their associated Google Places types */
export const SUPPORT_TYPES = [
  { value: 'all', label: 'Tous les supports', placeTypes: ['bakery', 'pharmacy', 'bar', 'cafe', 'restaurant', 'store', 'convenience_store', 'laundry', 'hair_care', 'beauty_salon'] },
  { value: 'sac_pain', label: 'Sac à pain', placeTypes: ['bakery'] },
  { value: 'sac_pharmacie', label: 'Sac à pharmacie', placeTypes: ['pharmacy'] },
  { value: 'sous_bock', label: 'Sous-bock', placeTypes: ['bar', 'cafe'] },
  { value: 'set_table', label: 'Set de table', placeTypes: ['restaurant', 'cafe'] },
  { value: 'affiche_a3', label: 'Affiche A3', placeTypes: ['store', 'convenience_store', 'laundry', 'hair_care', 'beauty_salon'] },
] as const

export type SupportType = (typeof SUPPORT_TYPES)[number]['value']

const PLACE_TYPE_LABELS: Record<string, string> = {
  bakery: 'Boulangerie',
  pharmacy: 'Pharmacie',
  bar: 'Bar',
  cafe: 'Café / Brasserie',
  restaurant: 'Restaurant',
  store: 'Commerce',
  convenience_store: 'Épicerie',
  laundry: 'Pressing',
  hair_care: 'Coiffeur',
  beauty_salon: 'Salon de beauté',
}

export interface PotentialSpot {
  name: string
  address: string
  lat: number
  lng: number
  type: string
  typeLabel: string
}

export interface GeocodedCity {
  lat: number
  lng: number
  formattedName: string
}

export interface CitySuggestion {
  name: string
  placeId: string
}

/** Autocomplete city names using Places Autocomplete API */
export async function autocompleteCities(input: string): Promise<CitySuggestion[]> {
  if (!API_KEY || input.trim().length < 2) return []
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      input,
      includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'postal_code'],
      includedRegionCodes: ['fr'],
      languageCode: 'fr',
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.suggestions ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((s: any) => s.placePrediction)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({
      name: s.placePrediction.text?.text ?? '',
      placeId: s.placePrediction.placeId ?? '',
    }))
    .slice(0, 5)
}

/** Geocode a city name to GPS coordinates using Places Text Search (no separate Geocoding API needed) */
export async function geocodeCity(city: string): Promise<GeocodedCity | null> {
  if (!API_KEY) return null
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.formattedAddress,places.location',
    },
    body: JSON.stringify({
      textQuery: `${city}, France`,
      languageCode: 'fr',
      maxResultCount: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const place = data.places?.[0]
  if (!place?.location) return null
  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    formattedName: place.formattedAddress ?? city,
  }
}

/**
 * Generate a grid of center points covering a circle of given radius.
 * Uses a hex-like grid with spacing = SUB_RADIUS_M * 1.5 for good overlap.
 */
function generateGridPoints(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): { lat: number; lng: number }[] {
  const step = SUB_RADIUS_M * 1.5
  const points: { lat: number; lng: number }[] = []
  const toRad = (d: number) => (d * Math.PI) / 180

  // 1 degree of latitude ≈ 111320m
  const latStep = step / 111320
  // 1 degree of longitude depends on latitude
  const lngStep = step / (111320 * Math.cos(toRad(centerLat)))

  const gridRadius = Math.ceil(radiusMeters / step)

  for (let dy = -gridRadius; dy <= gridRadius; dy++) {
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      const lat = centerLat + dy * latStep
      const lng = centerLng + dx * lngStep
      // Keep only points inside the main search circle
      if (getDistanceMeters({ lat, lng }, { lat: centerLat, lng: centerLng }) <= radiusMeters) {
        points.push({ lat, lng })
      }
    }
  }

  return points
}

/** Single Nearby Search call */
async function searchNearbyChunk(
  lat: number,
  lng: number,
  radius: number,
  placeTypes: readonly string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      includedTypes: placeTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      languageCode: 'fr',
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.places ?? []
}

/** Search potential OOH spots using Google Places Nearby Search, filtered by support type.
 *  Subdivides large areas into a grid of smaller queries for better coverage. */
export async function searchPotentialSpots(
  lat: number,
  lng: number,
  radiusKm: number,
  supportType: SupportType = 'all',
  onProgress?: (done: number, total: number) => void,
): Promise<PotentialSpot[]> {
  if (!API_KEY) return []

  const config = SUPPORT_TYPES.find((s) => s.value === supportType) ?? SUPPORT_TYPES[0]
  const radiusMeters = radiusKm * 1000

  // For small radii (≤ SUB_RADIUS_M), single request is enough
  const gridPoints =
    radiusMeters <= SUB_RADIUS_M
      ? [{ lat, lng }]
      : generateGridPoints(lat, lng, radiusMeters)

  const subRadius = Math.min(radiusMeters, SUB_RADIUS_M)

  // Run all sub-queries in parallel batches of 5 to avoid rate limits
  const BATCH_SIZE = 5
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPlaces: any[] = []
  let done = 0

  for (let i = 0; i < gridPoints.length; i += BATCH_SIZE) {
    const batch = gridPoints.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((pt) => searchNearbyChunk(pt.lat, pt.lng, subRadius, config.placeTypes)),
    )
    for (const places of results) {
      allPlaces.push(...places)
    }
    done += batch.length
    onProgress?.(done, gridPoints.length)
  }

  // Deduplicate by Google place ID
  const seen = new Set<string>()
  const unique = allPlaces.filter((p) => {
    const id = p.id as string
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unique.map((p: any) => {
    const types = (p.types as string[]) ?? []
    const matchedType = types.find((t) => (config.placeTypes as readonly string[]).includes(t)) ?? types[0] ?? ''
    return {
      name: (p.displayName?.text as string) ?? '',
      address: (p.formattedAddress as string) ?? '',
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      type: matchedType,
      typeLabel: PLACE_TYPE_LABELS[matchedType] ?? matchedType,
    }
  })
}

/** Haversine distance in meters between two points */
export function getDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Filter out spots that are within 50m of an existing panel */
export function filterCoveredSpots(
  spots: PotentialSpot[],
  existingPanels: { lat: number; lng: number }[],
): PotentialSpot[] {
  return spots.filter(
    (spot) =>
      !existingPanels.some(
        (panel) => getDistanceMeters(spot, panel) < 50,
      ),
  )
}
