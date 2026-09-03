const OSLO_TIME_ZONE = 'Europe/Oslo'
const CLOSED_FROM_HOUR = 23
const CLOSED_UNTIL_HOUR = 5

function currentHourInOslo(now: Date): number {
  const hourText = new Intl.DateTimeFormat('en-GB', {
    timeZone: OSLO_TIME_ZONE,
    hour: 'numeric',
    hour12: false,
  }).format(now)

  return Number(hourText === '24' ? '0' : hourText)
}

/**
 * Voi, Bolt, and Ryde all park their Oslo fleets overnight, so the feeds
 * report no vehicles between roughly 23:00 and 05:00 regardless of app
 * state. Showing this as a scheduled closure instead of an empty result
 * avoids implying something is broken.
 */
export function isOutsideOsloOperatingHours(now: Date = new Date()): boolean {
  const hour = currentHourInOslo(now)
  return hour >= CLOSED_FROM_HOUR || hour < CLOSED_UNTIL_HOUR
}
