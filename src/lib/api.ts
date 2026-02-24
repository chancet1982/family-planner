import { supabase } from './supabase'

export async function inviteHouseholdMember(personId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-household-member', {
    body: { person_id: personId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function linkInvitedUser(personId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('link-invited-user', {
    body: { person_id: personId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
