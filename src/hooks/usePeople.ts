import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Person } from '../types'
import { useHouseholdId } from './useHousehold'

export function usePeople() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['people', householdId],
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('household_id', householdId!)
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as Person[]
    },
    enabled: !!householdId,
  })
}

export function usePersonMutations() {
  const queryClient = useQueryClient()
  const householdId = useHouseholdId()

  const create = useMutation({
    mutationFn: async (input: { name: string; role: Person['role']; avatar_color?: Person['avatar_color'] }) => {
      const { data: max } = await supabase
        .from('people')
        .select('display_order')
        .eq('household_id', householdId!)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()
      const nextOrder = (max?.display_order ?? -1) + 1
      const { data, error } = await supabase
        .from('people')
        .insert({
          household_id: householdId!,
          name: input.name,
          role: input.role,
          display_order: nextOrder,
          avatar_color: input.avatar_color ?? 'blue',
        })
        .select()
        .single()
      if (error) throw error
      return data as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', householdId] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Person> & { id: string }) => {
      const { data, error } = await supabase
        .from('people')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', householdId] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', householdId] })
    },
  })

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('people').update({ display_order: index }).eq('id', id)
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', householdId] })
    },
  })

  return { create, update, remove, reorder }
}
