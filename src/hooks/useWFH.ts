import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WorkFromHome } from '../types'
import { useHouseholdId } from './useHousehold'

export function useWFH() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['work_from_home', householdId],
    queryFn: async (): Promise<WorkFromHome[]> => {
      const { data, error } = await supabase
        .from('work_from_home')
        .select('*')
      if (error) throw error
      return (data ?? []) as WorkFromHome[]
    },
    enabled: !!householdId,
  })
}

export function useWFHMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const setDay = useMutation({
    mutationFn: async ({ personId, dayOfWeek, add }: { personId: string; dayOfWeek: number; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from('work_from_home').insert({
          person_id: personId,
          day_of_week: dayOfWeek,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('work_from_home')
          .delete()
          .eq('person_id', personId)
          .eq('day_of_week', dayOfWeek)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_from_home', householdId] })
    },
  })

  return { setDay }
}
