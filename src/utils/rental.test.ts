import { describe, expect, it } from 'vitest'
import type { Scooter } from '../types/scooter'
import { rentalUriForScooter } from './rental'

const scooter: Scooter = {
  id: 'bolt-1',
  provider: 'bolt',
  latitude: 59.92,
  longitude: 10.74,
  isReserved: false,
  isDisabled: false,
  rentalUris: {
    web: 'https://bolt.eu/scooter/bolt-1',
    ios: 'bolt://ios/bolt-1',
    android: 'bolt://android/bolt-1',
  },
}

describe('rentalUriForScooter', () => {
  it('selects the Android deep link on Android', () => {
    expect(rentalUriForScooter(scooter, 'Mozilla/5.0 Android')).toBe(
      'bolt://android/bolt-1',
    )
  })

  it('selects the iOS deep link on iPhone', () => {
    expect(rentalUriForScooter(scooter, 'Mozilla/5.0 iPhone')).toBe(
      'bolt://ios/bolt-1',
    )
  })

  it('returns no action when the feed provides no rental URI', () => {
    expect(
      rentalUriForScooter({ ...scooter, rentalUris: undefined }, 'Android'),
    ).toBeUndefined()
  })
})