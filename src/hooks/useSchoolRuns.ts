import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SchoolRun } from '../types'
import { useHouseholdId } from './useHousehold'

export function useSchoolRuns() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['school_runs', householdId],
    queryFn: async (): Promise<SchoolRun | null> => {
      const { data, error } = await supabase
        .from('school_runs')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle()
      if (error) throw error
      return data as SchoolRun | null
    },
    enabled: !!householdId,
  })
}

export function useSchoolRunMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const upsertLabel = useMutation({
    mutationFn: async (input: { label: string }) => {
      const { data, error } = await supabase
        .from('school_runs')
        .upsert(
          {
            household_id: householdId!,
            label: input.label,
            drop_off_time: null,
            pick_up_time: null,
          },
          { onConflict: 'household_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as SchoolRun
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_runs', householdId] })
    },
  })

  return { upsertLabel }
}
