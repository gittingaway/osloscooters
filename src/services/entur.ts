import type {
  EnturSystem,
  ProviderFailure,
  RentalUris,
  Scooter,
  ScooterFetchResult,
  ScooterProvider,
} from '../types/scooter'

const API_ROOT = 'https://api.entur.io/mobility/v2/gbfs/v3'
const configuredClientName = import.meta.env.VITE_ENTUR_CLIENT_NAME?.trim()
const CLIENT_NAME =
  configuredClientName && /^[a-z0-9_]+-[a-z0-9_-]+$/.test(configuredClientName)
    ? configuredClientName
    : 'jonatan-e_scooter'
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000

const providers: ReadonlyArray<{
  provider: ScooterProvider
  system: EnturSystem
}> = [
  { provider: 'voi', system: 'voioslo' },
  { provider: 'bolt', system: 'boltoslo' },
  { provider: 'ryde', system: 'rydeoslo' },
]

type JsonObject = Record<string, unknown>

class EnturRequestError extends Error {
  readonly retryAt?: number

  constructor(status: number, retryAt?: number) {
    super(`Entur request failed with status ${status}`)
    this.retryAt = retryAt
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

function optionalStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined
}

function getRentalUris(value: unknown): RentalUris | undefined {
  if (!isObject(value)) {
    return undefined
  }

  const rentalUris: RentalUris = {}
  for (const platform of ['web', 'ios', 'android'] as const) {
    const uri = value[platform]
    if (typeof uri === 'string') {
      rentalUris[platform] = uri
    }
  }

  return Object.keys(rentalUris).length > 0 ? rentalUris : undefined
}

function getBatteryPercent(vehicle: JsonObject): number | undefined {
  const currentFuel = optionalFiniteNumber(vehicle.current_fuel_percent)
  if (currentFuel !== undefined && currentFuel >= 0 && currentFuel <= 1) {
    return Math.round(currentFuel * 100)
  }

  const battery = optionalFiniteNumber(vehicle.battery_percent)
  if (battery !== undefined && battery >= 0 && battery <= 100) {
    return Math.round(battery)
  }

  return undefined
}

function normalizeVehicle(
  value: unknown,
  provider: ScooterProvider,
): Scooter | undefined {
  if (!isObject(value)) {
    return undefined
  }

  const latitude = optionalFiniteNumber(value.lat)
  const longitude = optionalFiniteNumber(value.lon)
  const id = value.vehicle_id

  if (
    typeof id !== 'string' ||
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    value.is_reserved === true ||
    value.is_disabled === true
  ) {
    return undefined
  }

  return {
    id,
    provider,
    latitude,
    longitude,
    rangeMeters: optionalFiniteNumber(value.current_range_meters),
    batteryPercent: getBatteryPercent(value),
    isReserved: false,
    isDisabled: false,
    lastReported: optionalStringOrNumber(value.last_reported),
    vehicleTypeId:
      typeof value.vehicle_type_id === 'string'
        ? value.vehicle_type_id
        : undefined,
    rentalUris: getRentalUris(value.rental_uris),
  }
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { 'ET-Client-Name': CLIENT_NAME },
  })

  if (!response.ok) {
    let retryAt: number | undefined
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN
      const retryAfterDate = retryAfter ? Date.parse(retryAfter) : Number.NaN
      const expiryDate = Date.parse(
        response.headers.get('Rate-Limit-Expiry-Time') ?? '',
      )

      if (Number.isFinite(retryAfterSeconds)) {
        retryAt = Date.now() + retryAfterSeconds * 1000
      } else if (Number.isFinite(retryAfterDate)) {
        retryAt = retryAfterDate
      } else if (Number.isFinite(expiryDate)) {
        retryAt = expiryDate
      } else {
        retryAt = Date.now() + DEFAULT_RATE_LIMIT_COOLDOWN_MS
      }
    }

    throw new EnturRequestError(response.status, retryAt)
  }

  return response.json()
}

function findVehicleStatusUrl(discovery: unknown): string {
  if (!isObject(discovery) || !isObject(discovery.data)) {
    throw new Error('Entur discovery response is malformed')
  }

  const feeds = discovery.data.feeds
  if (!Array.isArray(feeds)) {
    throw new Error('Entur discovery response has no feeds')
  }

  const vehicleFeed = feeds.find(
    (feed) =>
      isObject(feed) &&
      feed.name === 'vehicle_status' &&
      typeof feed.url === 'string',
  )

  if (!isObject(vehicleFeed) || typeof vehicleFeed.url !== 'string') {
    throw new Error('Entur discovery has no vehicle_status feed')
  }

  return vehicleFeed.url
}

function getVehicles(response: unknown): unknown[] {
  if (!isObject(response) || !isObject(response.data)) {
    throw new Error('Entur vehicle response is malformed')
  }

  const vehicles = response.data.vehicles
  if (!Array.isArray(vehicles)) {
    throw new Error('Entur vehicle response has no vehicles')
  }

  return vehicles
}

function providerForSystem(system: EnturSystem): ScooterProvider {
  return system.replace(/oslo$/, '') as ScooterProvider
}

export async function fetchProviderVehicles(
  system: EnturSystem,
  fetcher: typeof fetch = fetch,
): Promise<Scooter[]> {
  const provider = providerForSystem(system)
  const discovery = await fetchJson(`${API_ROOT}/${system}/gbfs`, fetcher)
  const vehicleStatusUrl = findVehicleStatusUrl(discovery)
  const response = await fetchJson(vehicleStatusUrl, fetcher)

  return getVehicles(response).flatMap((vehicle) => {
    const scooter = normalizeVehicle(vehicle, provider)
    return scooter ? [scooter] : []
  })
}

function toFailure(
  provider: ScooterProvider,
  reason: unknown,
): ProviderFailure {
  return {
    provider,
    message: reason instanceof Error ? reason.message : 'Unknown Entur error',
    retryAt:
      reason instanceof EnturRequestError ? reason.retryAt : undefined,
  }
}

export async function fetchScooters(
  fetcher: typeof fetch = fetch,
): Promise<ScooterFetchResult> {
  const results = await Promise.allSettled(
    providers.map(({ system }) => fetchProviderVehicles(system, fetcher)),
  )

  const scooters: Scooter[] = []
  const failures: ProviderFailure[] = []

  results.forEach((result, index) => {
    const provider = providers[index].provider
    if (result.status === 'fulfilled') {
      scooters.push(...result.value)
    } else {
      failures.push(toFailure(provider, result.reason))
    }
  })

  return { scooters, failures }
}