import { ExternalLink } from 'lucide-react'
import type { ScooterProvider } from '../types/scooter'
import { providerName } from '../utils/provider'

interface RentalLinkProps {
  provider: ScooterProvider
  uri: string
  iconSize?: number
}

export function RentalLink({ provider, uri, iconSize = 14 }: RentalLinkProps) {
  const opensWebPage = /^https?:\/\//i.test(uri)

  return (
    <a
      className={`rental-link rental-link--${provider}`}
      href={uri}
      target={opensWebPage ? '_blank' : undefined}
      rel={opensWebPage ? 'noreferrer' : undefined}
    >
      Open in {providerName(provider)}
      <ExternalLink size={iconSize} aria-hidden="true" />
    </a>
  )
}