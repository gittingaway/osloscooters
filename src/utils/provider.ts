import type { ScooterProvider } from '../types/scooter'

const providerNames: Record<ScooterProvider, string> = {
  voi: 'Voi',
  bolt: 'Bolt',
  ryde: 'Ryde',
}

export function providerName(provider: ScooterProvider): string {
  return providerNames[provider]
}

export function providerInitial(provider: ScooterProvider): string {
  return providerNames[provider].charAt(0)
}