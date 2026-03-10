import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { GymnasticsSchedule } from '../types'
import { useHouseholdId } from './useHousehold'

export function useGymnastics() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['gymnastics', householdId],
    queryFn: async (): Promise<GymnasticsSchedule[]> => {
      const { data, error } = await supabase
        .from('gymnastics_schedule')
        .select('*')
      if (error) throw error
      return (data ?? []) as GymnasticsSchedule[]
    },
    enabled: !!householdId,
  })
}

export function useGymnasticsMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const setDay = useMutation({
    mutationFn: async ({ personId, dayOfWeek, add }: { personId: string; dayOfWeek: number; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from('gymnastics_schedule').insert({
          person_id: personId,
          day_of_week: dayOfWeek,
        })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('gymnastics_schedule')
          .delete()
          .eq('person_id', personId)
          .eq('day_of_week', dayOfWeek)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymnastics', householdId] })
    },
  })

  return { setDay }
}

