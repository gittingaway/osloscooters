import type { RentalUris, Scooter } from '../types/scooter'

function uriForPlatform(
  rentalUris: RentalUris,
  userAgent: string,
): string | undefined {
  if (/android/i.test(userAgent)) {
    return rentalUris.android ?? rentalUris.web
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return rentalUris.ios ?? rentalUris.web
  }

  return rentalUris.web ?? rentalUris.ios ?? rentalUris.android
}

export function rentalUriForScooter(
  scooter: Scooter,
  userAgent = navigator.userAgent,
): string | undefined {
  return scooter.rentalUris
    ? uriForPlatform(scooter.rentalUris, userAgent)
    : undefined
}