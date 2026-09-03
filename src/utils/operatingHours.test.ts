import { describe, expect, it } from 'vitest'
import { isOutsideOsloOperatingHours } from './operatingHours'

// These times are given in UTC. Oslo is UTC+1 (winter) or UTC+2 (summer).
describe('isOutsideOsloOperatingHours', () => {
  it('is closed at 23:30 Oslo winter time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-01-15T22:30:00Z'))).toBe(
      true,
    )
  })

  it('is closed at 02:00 Oslo winter time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-01-15T01:00:00Z'))).toBe(
      true,
    )
  })

  it('is open at 08:00 Oslo winter time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-01-15T07:00:00Z'))).toBe(
      false,
    )
  })

  it('is open right at 05:00 Oslo winter time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-01-15T04:00:00Z'))).toBe(
      false,
    )
  })

  it('is closed right at 23:00 Oslo winter time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-01-15T22:00:00Z'))).toBe(
      true,
    )
  })

  it('is open at noon Oslo summer time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-07-15T10:00:00Z'))).toBe(
      false,
    )
  })

  it('is closed at 23:30 Oslo summer time', () => {
    expect(isOutsideOsloOperatingHours(new Date('2026-07-15T21:30:00Z'))).toBe(
      true,
    )
  })
})
