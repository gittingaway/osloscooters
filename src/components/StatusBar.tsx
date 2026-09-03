import { useEffect, useState } from 'react'

interface StatusBarProps {
  updatedAt?: number
}

function updateAge(updatedAt: number | undefined, now: number): string {
  if (updatedAt === undefined) {
    return 'Not updated yet'
  }

  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000))
  return seconds < 5 ? 'Updated just now' : `Updated ${seconds} sec ago`
}

export function StatusBar({ updatedAt }: StatusBarProps) {
  const [now, setNow] = useState(updatedAt ?? 0)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <span className="app-status hud-glass" aria-live="polite">
      {updateAge(updatedAt, now)}
    </span>
  )
}
