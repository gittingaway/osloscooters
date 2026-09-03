import { render } from '@testing-library/react'
import L from 'leaflet'
import { describe, expect, it, vi } from 'vitest'
import { ScooterMap } from './ScooterMap'
import type { Scooter } from '../types/scooter'

const location = { latitude: 59.9139, longitude: 10.7522 }

const scooters: Scooter[] = [
  {
    id: 'bolt-1',
    provider: 'bolt',
    latitude: 59.914,
    longitude: 10.753,
    distanceMeters: 90,
    isReserved: false,
    isDisabled: false,
  },
]

describe('ScooterMap', () => {
  it('does not recenter when the scooter list is refreshed with the same location', () => {
    const setViewSpy = vi.spyOn(L.Map.prototype, 'setView')

    const { rerender } = render(
      <ScooterMap
        location={location}
        scooters={scooters}
        onSelectScooter={vi.fn()}
      />,
    )
    const callsAfterInitialRender = setViewSpy.mock.calls.length

    // Same location, new array reference and new selected value cleared -
    // this simulates a poll refresh or a provider filter change.
    rerender(
      <ScooterMap
        location={{ ...location }}
        scooters={[...scooters]}
        selectedScooter={undefined}
        onSelectScooter={vi.fn()}
      />,
    )

    expect(setViewSpy.mock.calls.length).toBe(callsAfterInitialRender)
    setViewSpy.mockRestore()
  })

  it('recenters when the location actually moves', () => {
    const setViewSpy = vi.spyOn(L.Map.prototype, 'setView')

    const { rerender } = render(
      <ScooterMap
        location={location}
        scooters={scooters}
        onSelectScooter={vi.fn()}
      />,
    )
    const callsAfterInitialRender = setViewSpy.mock.calls.length

    rerender(
      <ScooterMap
        location={{ latitude: 59.92, longitude: 10.76 }}
        scooters={scooters}
        onSelectScooter={vi.fn()}
      />,
    )

    expect(setViewSpy.mock.calls.length).toBeGreaterThan(
      callsAfterInitialRender,
    )
    setViewSpy.mockRestore()
  })

  it('focuses a selected scooter without waiting for a location change', () => {
    const setViewSpy = vi.spyOn(L.Map.prototype, 'setView')

    const { rerender } = render(
      <ScooterMap
        location={location}
        scooters={scooters}
        onSelectScooter={vi.fn()}
      />,
    )
    const callsAfterInitialRender = setViewSpy.mock.calls.length

    rerender(
      <ScooterMap
        location={location}
        scooters={scooters}
        selectedScooter={scooters[0]}
        onSelectScooter={vi.fn()}
      />,
    )

    const lastCall = setViewSpy.mock.calls.at(-1)
    expect(lastCall?.[0]).toEqual([
      scooters[0].latitude,
      scooters[0].longitude,
    ])
    expect(lastCall?.[1]).toBe(18)
    expect(setViewSpy.mock.calls.length).toBeGreaterThan(
      callsAfterInitialRender,
    )
    setViewSpy.mockRestore()
  })
})
