import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProviderFailure } from '../types/scooter'
import { providerName } from '../utils/provider'

interface ProviderFailureToastProps {
  failures: ProviderFailure[]
}

function joinProviderNames(failures: ProviderFailure[]): string {
  const names = failures.map(({ provider }) => providerName(provider))
  if (names.length === 1) {
    return names[0]
  }

  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function failureDescription(failures: ProviderFailure[]): string {
  const reasons = [...new Set(failures.map(({ message }) => message))]
  if (reasons.length <= 2) {
    return reasons.join(' · ')
  }

  return `${reasons.slice(0, 2).join(' · ')} · ${reasons.length - 2} more`
}

export function ProviderFailureToast({ failures }: ProviderFailureToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(false), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <aside className="failure-toast" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <strong>{joinProviderNames(failures)} unavailable</strong>
        <p>{failureDescription(failures)}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss provider failure"
        onClick={() => setIsVisible(false)}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}