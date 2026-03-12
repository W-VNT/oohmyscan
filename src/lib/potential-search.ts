const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const FIELDS = 'places.displayName,places.formattedAddress,places.location,places.types'

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

/** Search potential OOH spots using Google Places Nearby Search, filtered by support type */
export async function searchPotentialSpots(
  lat: number,
  lng: number,
  radiusKm: number,
  supportType: SupportType = 'all',
): Promise<PotentialSpot[]> {
  if (!API_KEY) return []

  const config = SUPPORT_TYPES.find((s) => s.value === supportType) ?? SUPPORT_TYPES[0]
  const radiusMeters = radiusKm * 1000

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      includedTypes: config.placeTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      languageCode: 'fr',
    }),
  })

  if (!res.ok) return []
  const data = await res.json()
  const places = data.places ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return places.map((p: any) => {
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
