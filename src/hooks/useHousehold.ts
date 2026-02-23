import { useProfile } from './useProfile'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Household } from '../types'

export function useHouseholdId(): string | null {
  const { data: profile } = useProfile()
  return profile?.household_id ?? null
}

export function useHousehold() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['household', householdId],
    queryFn: async (): Promise<Household | null> => {
      if (!householdId) return null
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single()
      if (error) throw error
      return data as Household
    },
    enabled: !!householdId,
  })
}
