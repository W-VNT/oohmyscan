const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location,places.shortFormattedAddress'

export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
}

function parsePlaces(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  places: any[],
): PlaceSuggestion[] {
  return places.map((p) => {
    const short = (p.shortFormattedAddress as string) ?? ''
    const full = (p.formattedAddress as string) ?? ''
    // shortFormattedAddress is usually "street, city" — extract city from last part
    const parts = short.split(',').map((s: string) => s.trim())
    const city = parts.length > 1 ? parts[parts.length - 1] : ''
    const address = parts.length > 1 ? parts.slice(0, -1).join(', ') : short

    return {
      id: p.id as string,
      name: (p.displayName?.text as string) ?? '',
      address: address || full,
      city,
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
    }
  })
}

/**
 * Search nearby places around given coordinates.
 */
export async function nearbyPlaces(
  lng: number,
  lat: number,
  radius = 150,
): Promise<PlaceSuggestion[]> {
  if (!API_KEY) return []

  const res = await fetch(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
        languageCode: 'fr',
        maxResultCount: 5,
      }),
    },
  )

  if (!res.ok) return []
  const data = await res.json()
  return parsePlaces(data.places ?? [])
}

/**
 * Text-based place search biased toward given coordinates.
 */
export async function searchPlaces(
  query: string,
  lng: number,
  lat: number,
): Promise<PlaceSuggestion[]> {
  if (!query.trim() || !API_KEY) return []

  const res = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 2000,
          },
        },
        languageCode: 'fr',
        maxResultCount: 5,
      }),
    },
  )

  if (!res.ok) return []
  const data = await res.json()
  return parsePlaces(data.places ?? [])
}
