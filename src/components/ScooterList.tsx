import type { Scooter } from '../types/scooter'
import { ScooterCard } from './ScooterCard'

interface ScooterListProps {
  scooters: Scooter[]
}

export function ScooterList({ scooters }: ScooterListProps) {
  if (scooters.length === 0) {
    return (
      <div className="empty-state">
        <strong>No scooters in range</strong>
        <p>Try another provider or refresh in a moment.</p>
      </div>
    )
  }

  return (
    <ol className="scooter-list">
      {scooters.map((scooter) => (
        <ScooterCard
          key={`${scooter.provider}-${scooter.id}`}
          scooter={scooter}
        />
      ))}
    </ol>
  )
}