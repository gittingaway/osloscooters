import type { Coordinates } from '../utils/distance'

const ADDRESS_SEARCH_URL = 'https://ws.geonorge.no/adresser/v1/sok'

type JsonObject = Record<string, unknown>

export interface GeocodedAddress extends Coordinates {
  label: string
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function toGeocodedAddress(candidate: unknown): GeocodedAddress | undefined {
  if (!isObject(candidate) || !isObject(candidate.representasjonspunkt)) {
    return undefined
  }

  const latitude = candidate.representasjonspunkt.lat
  const longitude = candidate.representasjonspunkt.lon
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined
  }

  const addressText =
    typeof candidate.adressetekst === 'string'
      ? candidate.adressetekst
      : undefined
  const postalCode =
    typeof candidate.postnummer === 'string' ? candidate.postnummer : undefined
  const postalPlace =
    typeof candidate.poststed === 'string' ? candidate.poststed : undefined
  const postalLabel = [postalCode, postalPlace].filter(Boolean).join(' ')

  if (!addressText) {
    return undefined
  }

  return {
    latitude,
    longitude,
    label: postalLabel ? `${addressText}, ${postalLabel}` : addressText,
  }
}

/**
 * Returns up to a handful of matching Norwegian addresses for the given
 * query, suitable for a type-ahead suggestion list. Callers should debounce
 * calls while the user is typing.
 */
export async function searchAddresses(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<GeocodedAddress[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return []
  }

  const parameters = new URLSearchParams({
    sok: trimmed,
    fuzzy: 'true',
    treffPerSide: '5',
    side: '0',
  })
  const response = await fetcher(`${ADDRESS_SEARCH_URL}?${parameters}`)

  if (!response.ok) {
    throw new Error(`Address search failed with status ${response.status}`)
  }

  const body: unknown = await response.json()
  if (!isObject(body) || !Array.isArray(body.adresser)) {
    throw new Error('Address search response is malformed')
  }

  return body.adresser
    .map(toGeocodedAddress)
    .filter((address): address is GeocodedAddress => address !== undefined)
}
