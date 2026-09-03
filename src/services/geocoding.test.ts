import { describe, expect, it, vi } from 'vitest'
import { searchAddresses } from './geocoding'

describe('searchAddresses', () => {
  it('returns matching addresses with valid coordinates', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          adresser: [
            {
              adressetekst: 'Waldemar Thranes gate 1A',
              postnummer: '0171',
              poststed: 'OSLO',
              representasjonspunkt: {
                epsg: 'EPSG:4258',
                lat: 59.923053731274734,
                lon: 10.739194651187752,
              },
            },
            {
              adressetekst: 'Waldemar Thranes gate 1B',
              postnummer: '0171',
              poststed: 'OSLO',
              representasjonspunkt: {
                epsg: 'EPSG:4258',
                lat: 59.9231,
                lon: 10.7393,
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      searchAddresses('Waldemar Thranes gate 1, Oslo', fetcher),
    ).resolves.toEqual([
      {
        latitude: 59.923053731274734,
        longitude: 10.739194651187752,
        label: 'Waldemar Thranes gate 1A, 0171 OSLO',
      },
      {
        latitude: 59.9231,
        longitude: 10.7393,
        label: 'Waldemar Thranes gate 1B, 0171 OSLO',
      },
    ])
    expect(String(fetcher.mock.calls[0][0])).toContain(
      'sok=Waldemar+Thranes+gate+1%2C+Oslo',
    )
  })

  it('returns an empty list when nothing matches', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ adresser: [] })))

    await expect(searchAddresses('Missing address', fetcher)).resolves.toEqual(
      [],
    )
  })

  it('skips queries shorter than three characters without a request', async () => {
    const fetcher = vi.fn<typeof fetch>()

    await expect(searchAddresses('Os', fetcher)).resolves.toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('throws when the search request fails', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 500 }))

    await expect(searchAddresses('Karl Johans gate', fetcher)).rejects.toThrow(
      'Address search failed with status 500',
    )
  })
})
