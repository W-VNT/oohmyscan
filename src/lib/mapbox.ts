const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
}

/**
 * Reverse geocode to find nearby POIs at given coordinates.
 */
export async function nearbyPlaces(
  lng: number,
  lat: number,
): Promise<PlaceSuggestion[]> {
  if (!MAPBOX_TOKEN) return []

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
  )
  url.searchParams.set('types', 'poi')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', MAPBOX_TOKEN)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json()
  return (data.features ?? []).map((f: Record<string, unknown>) => {
    const ctx = (f.context as Array<{ id: string; text: string }>) ?? []
    const cityCtx = ctx.find((c) => c.id.startsWith('place'))
    const [fLng, fLat] = (f.center as [number, number]) ?? [lng, lat]
    const props = (f.properties as Record<string, string>) ?? {}
    const addressCtx = ctx.find((c) => c.id.startsWith('address'))
    const placeNameParts = ((f.place_name as string) ?? '').split(',').map((s) => s.trim())
    let streetAddress = ''
    if (props.address && addressCtx) {
      streetAddress = `${props.address} ${addressCtx.text}`
    } else if (addressCtx) {
      streetAddress = addressCtx.text
    } else if (placeNameParts.length > 1) {
      streetAddress = placeNameParts[1]
    }

    return {
      id: f.id as string,
      name: f.text as string,
      address: streetAddress,
      city: cityCtx?.text ?? '',
      lat: fLat,
      lng: fLng,
    }
  })
}

/**
 * Reverse geocode strict pour recuperer l'adresse (street + postcode + city)
 * a partir de coordonnees GPS. Utilise pour pre-remplir le form "nouveau lieu"
 * dans le wizard install operateur.
 */
export async function reverseGeocodeAddress(
  lng: number,
  lat: number,
): Promise<{ address: string; postal_code: string; city: string } | null> {
  if (!MAPBOX_TOKEN) return null
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
  )
  url.searchParams.set('types', 'address')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('limit', '1')
  url.searchParams.set('access_token', MAPBOX_TOKEN)

  const res = await fetch(url.toString())
  if (!res.ok) return null

  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature) return null

  const ctx = ((feature.context as Array<{ id: string; text: string }>) ?? [])
  const postcode = ctx.find((c) => c.id.startsWith('postcode'))?.text ?? ''
  const city = ctx.find((c) => c.id.startsWith('place'))?.text ?? ''
  // Le place_name commence par "<numero> <rue>, <postcode> <ville>, France"
  const street = ((feature.place_name as string) ?? '').split(',')[0]?.trim() ?? ''

  return { address: street, postal_code: postcode, city }
}

export async function searchPlaces(
  query: string,
  lng: number,
  lat: number,
): Promise<PlaceSuggestion[]> {
  if (!query.trim() || !MAPBOX_TOKEN) return []

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.set('proximity', `${lng},${lat}`)
  url.searchParams.set('types', 'poi,address')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', MAPBOX_TOKEN)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json()
  return (data.features ?? []).map((f: Record<string, unknown>) => {
    const ctx = (f.context as Array<{ id: string; text: string }>) ?? []
    const cityCtx = ctx.find((c) => c.id.startsWith('place'))
    const [fLng, fLat] = (f.center as [number, number]) ?? [lng, lat]
    // Build street address from properties + context
    const props = (f.properties as Record<string, string>) ?? {}
    const addressCtx = ctx.find((c) => c.id.startsWith('address'))
    // For POIs: properties.address = street number, context address = street name
    // For address results: f.text = full street address, no context needed
    const placeNameParts = ((f.place_name as string) ?? '').split(',').map((s) => s.trim())
    let streetAddress = ''
    if (props.address && addressCtx) {
      // POI with street number + street name
      streetAddress = `${props.address} ${addressCtx.text}`
    } else if (addressCtx) {
      streetAddress = addressCtx.text
    } else if (placeNameParts.length > 1) {
      // Fallback: second part of place_name is usually the street
      streetAddress = placeNameParts[1]
    }

    return {
      id: f.id as string,
      name: f.text as string,
      address: streetAddress,
      city: cityCtx?.text ?? '',
      lat: fLat,
      lng: fLng,
    }
  })
}
