import { supabase } from '@/lib/supabase'
import { geocodeAddress } from '@/lib/mapbox'

export interface GeocodeProgress {
  done: number
  total: number
}

export interface GeocodeResult {
  locations: number
  located: number
  notFound: string[]
  panelsUpdated: number
}

/**
 * Renseigne lat/lng des poses libres qui n'en ont pas (pose faite sans GPS),
 * a partir de l'adresse du lieu. Un appel Mapbox par lieu (pas par pose).
 * Essai 1 : adresse + code postal + ville. Essai 2 : nom du lieu + ville.
 */
export async function geocodeMissingFreePanels(
  onProgress?: (p: GeocodeProgress) => void,
): Promise<GeocodeResult> {
  const { data: rows, error } = await supabase
    .from('campaign_free_panels')
    .select('location_id')
    .or('lat.is.null,lng.is.null')
    .range(0, 19999)
  if (error) throw error

  const locationIds = Array.from(new Set((rows ?? []).map((r) => r.location_id).filter(Boolean)))
  const result: GeocodeResult = { locations: locationIds.length, located: 0, notFound: [], panelsUpdated: 0 }
  if (locationIds.length === 0) return result

  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('id, name, address, postal_code, city')
    .in('id', locationIds)
  if (locErr) throw locErr

  let done = 0
  onProgress?.({ done, total: locations?.length ?? 0 })
  for (const loc of locations ?? []) {
    const byAddress = [loc.address, [loc.postal_code, loc.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const coords =
      (await geocodeAddress(byAddress)) ??
      (await geocodeAddress([loc.name, loc.city].filter(Boolean).join(' ')))

    if (coords) {
      const { data: updated, error: updErr } = await supabase
        .from('campaign_free_panels')
        .update({ lat: coords.lat, lng: coords.lng })
        .eq('location_id', loc.id)
        .or('lat.is.null,lng.is.null')
        .select('id')
      if (updErr) throw updErr
      result.located += 1
      result.panelsUpdated += updated?.length ?? 0
    } else {
      result.notFound.push(loc.name)
    }
    done += 1
    onProgress?.({ done, total: locations?.length ?? 0 })
  }
  return result
}
