import { useEffect, useState } from 'react'
import type { Coordinates } from '../utils/distance'

interface LocatedCoordinates extends Coordinates {
  accuracyMeters: number
}

type LocationErrorKind = 'denied' | 'unavailable'

export type LocationState =
  | { status: 'prompt' }
  | { status: 'loading' }
  | { status: 'success'; location: LocatedCoordinates }
  | { status: 'error'; kind: LocationErrorKind; message: string }

function initialLocationState(): LocationState {
  if (!navigator.geolocation) {
    return {
      status: 'error',
      kind: 'unavailable',
      message: 'Location is not supported by this browser.',
    }
  }

  return { status: 'prompt' }
}

function locationError(error: GeolocationPositionError): LocationState {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      status: 'error',
      kind: 'denied',
      message: 'Location access is required to find nearby scooters.',
    }
  }

  return {
    status: 'error',
    kind: 'unavailable',
    message: 'Your location is unavailable right now.',
  }
}

/**
 * Location is only requested when `request()` is called, so the browser's
 * native permission prompt never appears before the app explains why it
 * needs your location.
 */
export function useLocation(enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LocationState>(initialLocationState)

  useEffect(() => {
    if (!enabled || attempt === 0 || !navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: 'success',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          },
        })
      },
      (error) => setState(locationError(error)),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      },
    )
  }, [attempt, enabled])

  function request() {
    if (!navigator.geolocation) {
      setState(initialLocationState())
      return
    }

    setState({ status: 'loading' })
    setAttempt((currentAttempt) => currentAttempt + 1)
  }

  return { state, request }
}