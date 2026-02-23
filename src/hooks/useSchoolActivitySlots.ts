import { useMemo } from 'react'
import { usePeople } from './usePeople'
import { useSchoolRunTimes } from './useSchoolRunTimes'
import { useSchoolRuns } from './useSchoolRuns'
import type { ActivitySlot } from '../types'

/** Weekdays only (school run times are only configured for Mon–Fri). */
const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const

/**
 * Returns school_run_times as activity slots: one "School" (or label) block per child per weekday,
 * with start_time = drop_off_time and end_time = pick_up_time. Use these together with real
 * activity slots in the schedule view.
 */
export function useSchoolActivitySlots(): ActivitySlot[] {
  const { data: people } = usePeople()
  const { data: timesMap } = useSchoolRunTimes()
  const { data: schoolRun } = useSchoolRuns()
  const kids = useMemo(() => (people ?? []).filter((p) => p.role === 'child'), [people])
  const label = schoolRun?.label ?? 'School'

  return useMemo(() => {
    const slots: ActivitySlot[] = []
    for (const child of kids) {
      for (const d of SCHOOL_DAYS) {
        const row = timesMap?.[d]
        if (!row) continue
        slots.push({
          id: `school-${d}-${child.id}`,
          activity_id: 'school',
          name: label,
          person_id: child.id,
          day_of_week: d,
          start_time: row.drop_off_time,
          end_time: row.pick_up_time,
        })
      }
    }
    return slots
  }, [kids, timesMap, label])
}
