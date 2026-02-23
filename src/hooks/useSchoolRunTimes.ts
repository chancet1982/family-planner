import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SchoolRunTime } from '../types'
import { useHouseholdId } from './useHousehold'

const DEFAULT_DROP = '08:00'
const DEFAULT_PICKUP = '15:00'

export function useSchoolRunTimes() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['school_run_times', householdId],
    queryFn: async (): Promise<Record<number, SchoolRunTime>> => {
      const [timesRes, runsRes] = await Promise.all([
        supabase.from('school_run_times').select('*').eq('household_id', householdId!),
        supabase.from('school_runs').select('drop_off_time, pick_up_time').eq('household_id', householdId!).maybeSingle(),
      ])
      if (timesRes.error) throw timesRes.error
      if (runsRes.error) throw runsRes.error
      const legacy = runsRes.data as { drop_off_time: string | null; pick_up_time: string | null } | null
      const map: Record<number, SchoolRunTime> = {}
      for (const row of timesRes.data ?? []) {
        const r = row as SchoolRunTime
        map[r.day_of_week] = r
      }
      for (let d = 1; d <= 7; d++) {
        if (!map[d]) {
          map[d] = {
            id: `legacy-${d}`,
            household_id: householdId!,
            day_of_week: d,
            drop_off_time: legacy?.drop_off_time ?? DEFAULT_DROP,
            pick_up_time: legacy?.pick_up_time ?? DEFAULT_PICKUP,
            drop_off_assigned_person_id: null,
            pick_up_assigned_person_id: null,
          } as SchoolRunTime
        }
      }
      return map
    },
    enabled: !!householdId,
  })
}

/** Get drop-off and pick-up for a day; fallback to defaults if no row. */
export function useSchoolRunTimeForDay(dayOfWeek: number) {
  const { data: timesMap } = useSchoolRunTimes()
  const row = timesMap?.[dayOfWeek]
  return {
    drop_off_time: row?.drop_off_time ?? DEFAULT_DROP,
    pick_up_time: row?.pick_up_time ?? DEFAULT_PICKUP,
  }
}

export function useSchoolRunTimesMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const upsertDay = useMutation({
    mutationFn: async (input: {
      day_of_week: number
      drop_off_time: string
      pick_up_time: string
      drop_off_assigned_person_id?: string | null
      pick_up_assigned_person_id?: string | null
    }) => {
      const { data, error } = await supabase
        .from('school_run_times')
        .upsert(
          {
            household_id: householdId!,
            day_of_week: input.day_of_week,
            drop_off_time: input.drop_off_time,
            pick_up_time: input.pick_up_time,
            drop_off_assigned_person_id: input.drop_off_assigned_person_id ?? null,
            pick_up_assigned_person_id: input.pick_up_assigned_person_id ?? null,
          },
          { onConflict: 'household_id,day_of_week' }
        )
        .select()
        .single()
      if (error) throw error
      return data as SchoolRunTime
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_run_times', householdId] })
    },
  })

  /** Set who does drop-off and pick-up for a day (when both parents WFH). Uses existing times for that day or defaults. */
  const setDayAssignments = useMutation({
    mutationFn: async (input: {
      day_of_week: number
      drop_off_assigned_person_id: string | null
      pick_up_assigned_person_id: string | null
    }) => {
      const existing = await supabase
        .from('school_run_times')
        .select('drop_off_time, pick_up_time')
        .eq('household_id', householdId!)
        .eq('day_of_week', input.day_of_week)
        .maybeSingle()
      const row = existing.data as { drop_off_time: string; pick_up_time: string } | null
      const { data, error } = await supabase
        .from('school_run_times')
        .upsert(
          {
            household_id: householdId!,
            day_of_week: input.day_of_week,
            drop_off_time: row?.drop_off_time ?? DEFAULT_DROP,
            pick_up_time: row?.pick_up_time ?? DEFAULT_PICKUP,
            drop_off_assigned_person_id: input.drop_off_assigned_person_id,
            pick_up_assigned_person_id: input.pick_up_assigned_person_id,
          },
          { onConflict: 'household_id,day_of_week' }
        )
        .select()
        .single()
      if (error) throw error
      return data as SchoolRunTime
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_run_times', householdId] })
    },
  })

  const upsertAllDays = useMutation({
    mutationFn: async (
      days: Array<{ day_of_week: number; drop_off_time: string; pick_up_time: string }>
    ) => {
      const rows = days.map((d) => ({
        household_id: householdId!,
        day_of_week: d.day_of_week,
        drop_off_time: d.drop_off_time,
        pick_up_time: d.pick_up_time,
      }))
      const { error } = await supabase.from('school_run_times').upsert(rows, {
        onConflict: 'household_id,day_of_week',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_run_times', householdId] })
    },
  })

  return { upsertDay, upsertAllDays, setDayAssignments }
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}
