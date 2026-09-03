import { describe, expect, it } from 'vitest'
import type { Scooter } from '../types/scooter'
import {
  distanceInMeters,
  formatDistance,
  withNearbyDistances,
} from './distance'

const userLocation = { latitude: 59.9139, longitude: 10.7522 }

function scooter(id: string, latitude: number): Scooter {
  return {
    id,
    provider: 'voi',
    latitude,
    longitude: userLocation.longitude,
    isReserved: false,
    isDisabled: false,
  }
}

describe('distance utilities', () => {
  it('calculates Haversine distance between Oslo coordinates', () => {
    const distance = distanceInMeters(userLocation, {
      latitude: 59.9111,
      longitude: 10.7522,
    })

    expect(distance).toBeCloseTo(311, 0)
  })

  it('uses a 300 metre radius and sorts nearest first', () => {
    const result = withNearbyDistances(
      [scooter('outside', 59.9111), scooter('near', 59.913)],
      userLocation,
    )

    expect(result.map(({ id }) => id)).toEqual(['near'])
    expect(result[0].distanceMeters).toBeGreaterThan(90)
  })

  it('formats rounded metre distances', () => {
    expect(formatDistance(89.6)).toBe('90 m')
  })
})