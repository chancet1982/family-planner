import { useMemo } from 'react'
import { usePeople } from './usePeople'
import { useWFH } from './useWFH'
import { useSchoolRunTimes } from './useSchoolRunTimes'
import { getAllocationForDay } from '../lib/allocation'
import type { AllocationResult } from '../types'

export function useAllocation(dayOfWeek: number): AllocationResult {
  const { data: people } = usePeople()
  const { data: wfhList } = useWFH()
  const { data: timesMap } = useSchoolRunTimes()
  const parents = useMemo(() => (people ?? []).filter((p) => p.role === 'parent'), [people])
  const stored = useMemo(() => {
    const row = timesMap?.[dayOfWeek]
    return row
      ? {
          drop_off_assigned_person_id: row.drop_off_assigned_person_id ?? null,
          pick_up_assigned_person_id: row.pick_up_assigned_person_id ?? null,
        }
      : null
  }, [timesMap, dayOfWeek])
  return useMemo(
    () => getAllocationForDay(dayOfWeek, parents, wfhList ?? [], stored),
    [dayOfWeek, parents, wfhList, stored]
  )
}

export function useAllocationsForWeek(): Record<number, AllocationResult> {
  const { data: people } = usePeople()
  const { data: wfhList } = useWFH()
  const { data: timesMap } = useSchoolRunTimes()
  const parents = useMemo(() => (people ?? []).filter((p) => p.role === 'parent'), [people])
  return useMemo(() => {
    const result: Record<number, AllocationResult> = {}
    for (let d = 1; d <= 7; d++) {
      const row = timesMap?.[d]
      const stored = row
        ? {
            drop_off_assigned_person_id: row.drop_off_assigned_person_id ?? null,
            pick_up_assigned_person_id: row.pick_up_assigned_person_id ?? null,
          }
        : null
      result[d] = getAllocationForDay(d, parents, wfhList ?? [], stored)
    }
    return result
  }, [parents, wfhList, timesMap])
}
