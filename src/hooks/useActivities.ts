import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Activity, ActivityOccurrence, ActivitySlot } from '../types'
import { useHouseholdId } from './useHousehold'

export function useActivities() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['activities', householdId],
    queryFn: async (): Promise<{ slots: ActivitySlot[]; activities: Activity[]; occurrences: ActivityOccurrence[] }> => {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('household_id', householdId!)
      if (activitiesError) throw activitiesError
      const activities = (activitiesData ?? []) as Activity[]
      if (activities.length === 0) {
        return { slots: [], activities: [], occurrences: [] }
      }
      const ids = activities.map((a) => a.id)
      const { data: occData, error: occError } = await supabase
        .from('activity_occurrences')
        .select('*')
        .in('activity_id', ids)
        .order('day_of_week')
        .order('start_time')
      if (occError) throw occError
      const occurrences = (occData ?? []) as ActivityOccurrence[]
      const activityById = new Map(activities.map((a) => [a.id, a]))
      const slots: ActivitySlot[] = occurrences.map((occ) => {
        const act = activityById.get(occ.activity_id)!
        return {
          id: occ.id,
          activity_id: occ.activity_id,
          name: act.name,
          person_id: act.person_id,
          day_of_week: occ.day_of_week,
          start_time: occ.start_time,
          end_time: occ.end_time,
        }
      })
      return { slots, activities, occurrences }
    },
    enabled: !!householdId,
  })
}

/** Flattened list of activity slots for schedule views (one per occurrence). */
export function useActivitySlots(): ActivitySlot[] {
  const { data } = useActivities()
  return data?.slots ?? []
}

export function useActivityMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const createActivityWithOccurrences = useMutation({
    mutationFn: async (input: {
      name: string
      person_id: string
      occurrences: Array<{ day_of_week: number; start_time: string; end_time: string }>
    }) => {
      const { data: act, error: actError } = await supabase
        .from('activities')
        .insert({
          household_id: householdId!,
          name: input.name.trim(),
          person_id: input.person_id,
        })
        .select()
        .single()
      if (actError) throw actError
      if (input.occurrences.length === 0) return { activity: act as Activity, occurrences: [] }
      const rows = input.occurrences.map((o) => ({
        activity_id: act.id,
        day_of_week: o.day_of_week,
        start_time: o.start_time,
        end_time: o.end_time,
      }))
      const { data: occData, error: occError } = await supabase
        .from('activity_occurrences')
        .insert(rows)
        .select()
      if (occError) throw occError
      return { activity: act as Activity, occurrences: (occData ?? []) as ActivityOccurrence[] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  const addOccurrence = useMutation({
    mutationFn: async (input: {
      activity_id: string
      day_of_week: number
      start_time: string
      end_time: string
    }) => {
      const { data, error } = await supabase
        .from('activity_occurrences')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as ActivityOccurrence
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  const updateOccurrence = useMutation({
    mutationFn: async (input: {
      id: string
      day_of_week?: number
      start_time?: string
      end_time?: string
    }) => {
      const { id, ...patch } = input
      const { data, error } = await supabase
        .from('activity_occurrences')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ActivityOccurrence
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  const updateActivity = useMutation({
    mutationFn: async (patch: Partial<Pick<Activity, 'name' | 'person_id'>> & { id: string }) => {
      const { id, ...rest } = patch
      const { data, error } = await supabase
        .from('activities')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Activity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  const removeOccurrence = useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase
        .from('activity_occurrences')
        .delete()
        .eq('id', occurrenceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  const removeActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', activityId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', householdId] })
    },
  })

  return {
    createActivityWithOccurrences,
    addOccurrence,
    updateOccurrence,
    updateActivity,
    removeOccurrence,
    removeActivity,
  }
}
