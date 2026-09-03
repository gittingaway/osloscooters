export const SCOOTER_PROVIDERS = ['voi', 'bolt', 'ryde'] as const

export type ScooterProvider = (typeof SCOOTER_PROVIDERS)[number]

export type EnturSystem = `${ScooterProvider}oslo`

export interface RentalUris {
  web?: string
  ios?: string
  android?: string
}

export interface Scooter {
  id: string
  provider: ScooterProvider
  latitude: number
  longitude: number
  distanceMeters?: number
  rangeMeters?: number
  batteryPercent?: number
  isReserved: boolean
  isDisabled: boolean
  lastReported?: string | number
  vehicleTypeId?: string
  rentalUris?: RentalUris
}

export interface ProviderFailure {
  provider: ScooterProvider
  message: string
  retryAt?: number
}

export interface ScooterFetchResult {
  scooters: Scooter[]
  failures: ProviderFailure[]
}