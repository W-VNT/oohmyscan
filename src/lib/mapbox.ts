const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
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
