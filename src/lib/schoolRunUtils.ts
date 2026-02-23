/**
 * Parse "HH:mm" to minutes since midnight; return null if invalid.
 */
export function parseTime(s: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!match) return null
  const h = parseInt(match[1]!, 10)
  const m = parseInt(match[2]!, 10)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * Format minutes since midnight to "HH:mm".
 */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Given activities for a day (each with start_time "HH:mm"), return 45 minutes before
 * the first (earliest) activity start as "HH:mm", or null if no activities.
 */
export function suggestedPickupForDay(activities: { start_time: string }[]): string | null {
  if (activities.length === 0) return null
  let minStart = 24 * 60
  for (const a of activities) {
    const mins = parseTime(a.start_time)
    if (mins != null && mins < minStart) minStart = mins
  }
  if (minStart >= 24 * 60) return null
  const pickupMins = Math.max(0, minStart - 45)
  return formatTime(pickupMins)
}
