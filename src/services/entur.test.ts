import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProviderVehicles, fetchScooters } from './entur'

const discovery = (url: string) => ({
  version: '3.0',
  data: {
    feeds: [
      { name: 'system_information', url: 'https://example.test/info' },
      { name: 'vehicle_status', url },
    ],
  },
})

function jsonResponse(
  body: unknown,
  status = 200,
  responseHeaders?: HeadersInit,
): Response {
  const headers = new Headers(responseHeaders)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}

afterEach(() => vi.restoreAllMocks())

describe('fetchProviderVehicles', () => {
  it('discovers, filters, and normalizes provider vehicles', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(discovery('https://example.test/voi/vehicles')),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          version: '3.0',
          data: {
            vehicles: [
              {
                vehicle_id: 'voi-1',
                lat: 59.9139,
                lon: 10.7522,
                is_reserved: false,
                is_disabled: false,
                current_range_meters: 12_400,
                current_fuel_percent: 0.64,
                last_reported: '2026-09-03T18:00:00Z',
                vehicle_type_id: 'voi-scooter',
                rental_uris: {
                  ios: 'voi://ios/scooter/voi-1',
                  android: 'voi://android/scooter/voi-1',
                },
              },
              {
                vehicle_id: 'reserved',
                lat: 59.91,
                lon: 10.75,
                is_reserved: true,
                is_disabled: false,
              },
              {
                vehicle_id: 'missing-location',
                is_reserved: false,
                is_disabled: false,
              },
            ],
          },
        }),
      )

    const scooters = await fetchProviderVehicles('voioslo', fetcher)

    expect(scooters).toEqual([
      {
        id: 'voi-1',
        provider: 'voi',
        latitude: 59.9139,
        longitude: 10.7522,
        rangeMeters: 12_400,
        batteryPercent: 64,
        isReserved: false,
        isDisabled: false,
        lastReported: '2026-09-03T18:00:00Z',
        vehicleTypeId: 'voi-scooter',
        rentalUris: {
          ios: 'voi://ios/scooter/voi-1',
          android: 'voi://android/scooter/voi-1',
        },
      },
    ])
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://example.test/voi/vehicles',
      expect.objectContaining({
        headers: { 'ET-Client-Name': 'jonatan-e_scooter' },
      }),
    )
  })

  it('rejects malformed feed responses', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(discovery('https://example.test/bad')))
      .mockResolvedValueOnce(jsonResponse({ data: {} }))

    await expect(fetchProviderVehicles('boltoslo', fetcher)).rejects.toThrow(
      'has no vehicles',
    )
  })
})

describe('fetchScooters', () => {
  it('keeps successful providers available when another fails', async () => {
    const now = Date.parse('2026-09-03T19:00:00Z')
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/voioslo/gbfs')) {
        return jsonResponse(discovery('https://example.test/voi/vehicles'))
      }
      if (url.endsWith('/boltoslo/gbfs')) {
        return jsonResponse({}, 429, { 'Retry-After': '30' })
      }
      if (url.endsWith('/rydeoslo/gbfs')) {
        return jsonResponse(discovery('https://example.test/ryde/vehicles'))
      }
      const provider = url.includes('/ryde/vehicles') ? 'ryde' : 'voi'
      return jsonResponse({
        data: {
          vehicles: [
            {
              vehicle_id: `${provider}-1`,
              lat: 59.9139,
              lon: 10.7522,
              is_reserved: false,
              is_disabled: false,
            },
          ],
        },
      })
    })

    const result = await fetchScooters(fetcher)

    expect(result.scooters.map(({ provider }) => provider)).toEqual([
      'voi',
      'ryde',
    ])
    expect(result.failures).toEqual([
      {
        provider: 'bolt',
        message: 'Entur request failed with status 429',
        retryAt: now + 30_000,
      },
    ])
  })
})