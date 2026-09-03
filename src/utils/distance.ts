import type { Scooter } from '../types/scooter'

export const DEFAULT_RADIUS_METERS = 300

export interface Coordinates {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function distanceInMeters(
  from: Coordinates,
  to: Coordinates,
): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

export function withNearbyDistances(
  scooters: Scooter[],
  location: Coordinates,
  radiusMeters = DEFAULT_RADIUS_METERS,
): Scooter[] {
  return scooters
    .map((scooter) => ({
      ...scooter,
      distanceMeters: distanceInMeters(location, {
        latitude: scooter.latitude,
        longitude: scooter.longitude,
      }),
    }))
    .filter(
      (scooter) =>
        scooter.distanceMeters !== undefined &&
        scooter.distanceMeters <= radiusMeters,
    )
    .sort(
      (first, second) =>
        (first.distanceMeters ?? Infinity) -
        (second.distanceMeters ?? Infinity),
    )
}

export function formatDistance(distanceMeters: number): string {
  return `${Math.round(distanceMeters)} m`
}

export function formatRange(rangeMeters: number): string {
  const kilometres = rangeMeters / 1000
  const formatted =
    kilometres >= 10 ? Math.round(kilometres) : kilometres.toFixed(1)
  return `~${formatted} km range`
}