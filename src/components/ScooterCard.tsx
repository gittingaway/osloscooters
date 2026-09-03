import type { Scooter } from '../types/scooter'
import { formatDistance } from '../utils/distance'
import { providerInitial, providerName } from '../utils/provider'
import { rentalUriForScooter } from '../utils/rental'
import { RentalLink } from './RentalLink'

interface ScooterCardProps {
  scooter: Scooter
}

function rangeLabel(rangeMeters: number): string {
  const kilometres = rangeMeters / 1000
  const formatted =
    kilometres >= 10 ? Math.round(kilometres) : kilometres.toFixed(1)
  return `~${formatted} km range`
}

export function ScooterCard({ scooter }: ScooterCardProps) {
  const rentalUri = rentalUriForScooter(scooter)

  return (
    <li className={`scooter-card scooter-card--${scooter.provider}`}>
      <div className="provider-mark" aria-hidden="true">
        {providerInitial(scooter.provider)}
      </div>
      <div className="scooter-card__identity">
        <strong>{providerName(scooter.provider)}</strong>
        <span>
          {scooter.distanceMeters === undefined
            ? 'Distance unavailable'
            : `${formatDistance(scooter.distanceMeters)} away`}
        </span>
      </div>
      {(scooter.rangeMeters !== undefined ||
        scooter.batteryPercent !== undefined ||
        rentalUri !== undefined) && (
        <div className="scooter-card__details">
          {(scooter.rangeMeters !== undefined ||
            scooter.batteryPercent !== undefined) && (
            <div className="scooter-card__telemetry">
              {scooter.rangeMeters !== undefined && (
                <span>{rangeLabel(scooter.rangeMeters)}</span>
              )}
              {scooter.batteryPercent !== undefined && (
                <span>{scooter.batteryPercent}% battery</span>
              )}
            </div>
          )}
          {rentalUri && (
            <RentalLink provider={scooter.provider} uri={rentalUri} />
          )}
        </div>
      )}
    </li>
  )
}