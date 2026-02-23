import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Chore } from '../types'
import { useHouseholdId } from './useHousehold'

const DEFAULT_REPEAT: Record<string, boolean> = {
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
}

export function useChores() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['chores', householdId],
    queryFn: async (): Promise<Chore[]> => {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('household_id', householdId!)
        .order('name')
      if (error) throw error
      return (data ?? []).map((c) => ({
        ...c,
        repeat_pattern: typeof c.repeat_pattern === 'object' && c.repeat_pattern != null
          ? { ...DEFAULT_REPEAT, ...(c.repeat_pattern as Record<string, boolean>) }
          : DEFAULT_REPEAT,
      })) as Chore[]
    },
    enabled: !!householdId,
  })
}

export function useChoreAssignments(choreId: string | null) {
  return useQuery({
    queryKey: ['chore_assignments', choreId],
    queryFn: async (): Promise<string[]> => {
      if (!choreId) return []
      const { data, error } = await supabase
        .from('chore_assignments')
        .select('person_id')
        .eq('chore_id', choreId)
      if (error) throw error
      return (data ?? []).map((a: { person_id: string }) => a.person_id)
    },
    enabled: !!choreId,
  })
}

export function useAllChoreAssignments(choreIds: string[]) {
  return useQuery({
    queryKey: ['chore_assignments_bulk', choreIds.sort().join(',')],
    queryFn: async (): Promise<Record<string, string[]>> => {
      if (choreIds.length === 0) return {}
      const { data, error } = await supabase
        .from('chore_assignments')
        .select('chore_id, person_id')
        .in('chore_id', choreIds)
      if (error) throw error
      const map: Record<string, string[]> = {}
      for (const row of data ?? []) {
        const r = row as { chore_id: string; person_id: string }
        if (!map[r.chore_id]) map[r.chore_id] = []
        map[r.chore_id].push(r.person_id)
      }
      return map
    },
    enabled: choreIds.length > 0,
  })
}

export function useChoreMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const create = useMutation({
    mutationFn: async (input: {
      name: string
      repeat_pattern: Record<string, boolean>
      time_of_day: string | null
      scheduled_time: string | null
    }) => {
      const { data, error } = await supabase
        .from('chores')
        .insert({
          household_id: householdId!,
          name: input.name,
          repeat_pattern: input.repeat_pattern,
          time_of_day: input.time_of_day || null,
          scheduled_time: input.scheduled_time || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Chore
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', householdId] })
    },
  })

  const update = useMutation({
    mutationFn: async ({
      id,
      name,
      repeat_pattern,
      time_of_day,
      scheduled_time,
    }: Partial<Chore> & { id: string }) => {
      const { data, error } = await supabase
        .from('chores')
        .update({ name, repeat_pattern, time_of_day, scheduled_time })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Chore
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', householdId] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', householdId] })
    },
  })

  const setAssignments = useMutation({
    mutationFn: async ({ choreId, personIds }: { choreId: string; personIds: string[] }) => {
      await supabase.from('chore_assignments').delete().eq('chore_id', choreId)
      if (personIds.length > 0) {
        const { error } = await supabase.from('chore_assignments').insert(
          personIds.map((person_id) => ({ chore_id: choreId, person_id }))
        )
        if (error) throw error
      }
    },
    onSuccess: (_, { choreId }) => {
      queryClient.invalidateQueries({ queryKey: ['chore_assignments', choreId] })
      queryClient.invalidateQueries({ queryKey: ['chore_assignments_bulk'] })
      queryClient.invalidateQueries({ queryKey: ['chores', householdId] })
    },
  })

  return { create, update, remove, setAssignments }
}
