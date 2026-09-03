import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScooters } from '../services/entur'
import { SCOOTER_PROVIDERS } from '../types/scooter'
import type {
  ProviderFailure,
  Scooter,
  ScooterFetchResult,
} from '../types/scooter'
import {
  DEFAULT_RADIUS_METERS,
  type Coordinates,
  withNearbyDistances,
} from '../utils/distance'

const REFRESH_INTERVAL_MS = 60_000

type ScooterFetcher = () => Promise<ScooterFetchResult>

interface ScooterState {
  scooters: Scooter[]
  failures: ProviderFailure[]
  isLoading: boolean
  isRefreshing: boolean
  updatedAt?: number
}

const initialState: ScooterState = {
  scooters: [],
  failures: [],
  isLoading: true,
  isRefreshing: false,
}

export function useScooters(
  location: Coordinates | undefined,
  scooterFetcher: ScooterFetcher = fetchScooters,
  radiusMeters = DEFAULT_RADIUS_METERS,
) {
  const [state, setState] = useState(initialState)
  const requestId = useRef(0)
  const isRequestInFlight = useRef(false)
  const rateLimitUntil = useRef(0)
  const updatedAt = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    if (
      !location ||
      isRequestInFlight.current ||
      Date.now() < rateLimitUntil.current
    ) {
      return
    }

    isRequestInFlight.current = true
    const currentRequest = ++requestId.current
    setState((current) => ({
      ...current,
      isLoading: current.updatedAt === undefined,
      isRefreshing: current.updatedAt !== undefined,
    }))

    try {
      const result = await scooterFetcher()
      if (currentRequest !== requestId.current) {
        return
      }

      const hasSuccessfulProvider =
        result.failures.length < SCOOTER_PROVIDERS.length
      rateLimitUntil.current = Math.max(
        0,
        ...result.failures.map(({ retryAt }) => retryAt ?? 0),
      )
      const refreshTime = hasSuccessfulProvider ? Date.now() : updatedAt.current
      updatedAt.current = refreshTime

      setState((current) => ({
        scooters: hasSuccessfulProvider ? result.scooters : current.scooters,
        failures: result.failures,
        isLoading: false,
        isRefreshing: false,
        updatedAt: refreshTime,
      }))
    } catch (error) {
      if (currentRequest !== requestId.current) {
        return
      }

      setState((current) => ({
        ...current,
        failures: SCOOTER_PROVIDERS.map((provider) => ({
          provider,
          message: String(error),
        })),
        isLoading: false,
        isRefreshing: false,
      }))
    } finally {
      isRequestInFlight.current = false
    }
  }, [location, scooterFetcher])

  useEffect(() => {
    if (location) {
      void refresh()
    }
  }, [location, refresh])

  useEffect(() => {
    if (!location) {
      return
    }

    let intervalId: number | undefined

    function startPolling() {
      if (intervalId === undefined) {
        intervalId = window.setInterval(() => {
          void refresh()
        }, REFRESH_INTERVAL_MS)
      }
    }

    function stopPolling() {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        stopPolling()
        return
      }

      const isStale =
        updatedAt.current === undefined ||
        Date.now() - updatedAt.current >= REFRESH_INTERVAL_MS
      if (isStale) {
        void refresh()
      }
      startPolling()
    }

    if (document.visibilityState === 'visible') {
      startPolling()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location, refresh])

  const nearbyScooters = location
    ? withNearbyDistances(state.scooters, location, radiusMeters)
    : []

  return { ...state, scooters: nearbyScooters, refresh }
}