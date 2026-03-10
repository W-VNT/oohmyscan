import { useState, useCallback } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false,
    error: null,
  })

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Géolocalisation non supportée' }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        })
      },
      (err) => {
        let message = 'Erreur de géolocalisation'
        if (err.code === 1) message = 'Permission de localisation refusée'
        if (err.code === 2) message = 'Position non disponible'
        if (err.code === 3) message = 'Délai de localisation dépassé'
        setState((s) => ({ ...s, loading: false, error: message }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  return { ...state, requestPosition }
}
