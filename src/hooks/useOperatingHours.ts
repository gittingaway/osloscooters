import { useEffect, useState } from 'react'
import { isOutsideOsloOperatingHours } from '../utils/operatingHours'

const CHECK_INTERVAL_MS = 60_000

// Set VITE_DISABLE_CLOSURE_OVERLAY=true when starting the dev server to
// keep working on the map/UI without fighting the real overnight closure
// window (23:00-05:00 Oslo time). Has no effect on production builds
// unless the variable is explicitly set at build time too.
const isClosureOverlayDisabled =
  import.meta.env.VITE_DISABLE_CLOSURE_OVERLAY === 'true'

/**
 * Re-evaluates the Oslo operating-hours window periodically so the app
 * shows the closure overlay right away when the clock passes 23:00 or 05:00
 * without needing a refresh.
 */
export function useIsOutsideOperatingHours(): boolean {
  const [isOutside, setIsOutside] = useState(
    () => !isClosureOverlayDisabled && isOutsideOsloOperatingHours(),
  )

  useEffect(() => {
    if (isClosureOverlayDisabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      setIsOutside(isOutsideOsloOperatingHours())
    }, CHECK_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return isOutside
}
