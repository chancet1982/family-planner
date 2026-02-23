export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const DAY_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
}

/** day_of_week 1-7 (Mon-Sun) to repeat_pattern key */
export function dayOfWeekToKey(dayOfWeek: number): string {
  return DAY_KEYS[dayOfWeek - 1] ?? 'mon'
}

export function keyToDayOfWeek(key: string): number {
  const i = DAY_KEYS.indexOf(key as (typeof DAY_KEYS)[number])
  return i >= 0 ? i + 1 : 1
}
