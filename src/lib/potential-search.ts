const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const FIELDS = 'places.displayName,places.formattedAddress,places.location,places.types'

/** Place types relevant for OOH billboard placement */
const OOH_PLACE_TYPES = [
  'shopping_mall',
  'subway_station',
  'train_station',
  'bus_station',
  'parking',
  'supermarket',
  'department_store',
  'stadium',
  'airport',
  'hospital',
  'university',
]

const OOH_TYPE_LABELS: Record<string, string> = {
  shopping_mall: 'Centre commercial',
  subway_station: 'Station de métro',
  train_station: 'Gare',
  bus_station: 'Gare routière',
  parking: 'Parking',
  supermarket: 'Supermarché',
  department_store: 'Grand magasin',
  stadium: 'Stade',
  airport: 'Aéroport',
  hospital: 'Hôpital',
  university: 'Université',
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

/** Search potential OOH spots using Google Places Nearby Search */
export async function searchPotentialSpots(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<PotentialSpot[]> {
  if (!API_KEY) return []

  const radiusMeters = radiusKm * 1000

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      includedTypes: OOH_PLACE_TYPES,
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
    const matchedType = types.find((t) => OOH_PLACE_TYPES.includes(t)) ?? types[0] ?? ''
    return {
      name: (p.displayName?.text as string) ?? '',
      address: (p.formattedAddress as string) ?? '',
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      type: matchedType,
      typeLabel: OOH_TYPE_LABELS[matchedType] ?? matchedType,
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
