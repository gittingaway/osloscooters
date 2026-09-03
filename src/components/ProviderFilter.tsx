import type { ProviderSelection } from '../App'

interface ProviderFilterProps {
  selected: ProviderSelection
  onChange: (provider: ProviderSelection) => void
}

const options: ReadonlyArray<{ id: ProviderSelection; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'voi', label: 'Voi' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'ryde', label: 'Ryde' },
]

export function ProviderFilter({ selected, onChange }: ProviderFilterProps) {
  return (
    <div className="provider-filter hud-glass" aria-label="Filter by provider">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`provider-filter__option provider-filter__option--${option.id}`}
          aria-pressed={selected === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.id !== 'all' && (
            <span className="provider-dot" aria-hidden="true" />
          )}
          {option.label}
        </button>
      ))}
    </div>
  )
}