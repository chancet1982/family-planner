import type { Person, WorkFromHome } from '../types'
import type { AllocationResult } from '../types'

/** Weekdays are Mon (1)–Fri (5); Sat (6) and Sun (7) are weekends. */
const isWeekday = (dayOfWeek: number) => dayOfWeek >= 1 && dayOfWeek <= 5

export interface StoredSchoolRunAssignments {
  drop_off_assigned_person_id: string | null
  pick_up_assigned_person_id: string | null
}

/**
 * For a given day (1–7), determine who does drop-off and who does pick-up:
 * - No parents WFH → needs_grandparents_alert (weekdays only)
 * - One parent WFH → that parent does both
 * - Two parents WFH → use stored assignments if valid, else default both to first WFH parent; can_select_assignments true
 */
export function getAllocationForDay(
  dayOfWeek: number,
  parents: Person[],
  wfhList: WorkFromHome[],
  stored?: StoredSchoolRunAssignments | null
): AllocationResult {
  const wfhParentIds = wfhList
    .filter((w) => w.day_of_week === dayOfWeek)
    .map((w) => w.person_id)
  const parentIds = parents.map((p) => p.id)
  const wfhParents = parentIds.filter((id) => wfhParentIds.includes(id))

  if (wfhParents.length === 0) {
    return {
      drop_off_parent_id: null,
      pick_up_parent_id: null,
      needs_grandparents_alert: isWeekday(dayOfWeek),
      can_select_assignments: false,
    }
  }

  if (wfhParents.length === 1) {
    const sole = wfhParents[0] ?? null
    return {
      drop_off_parent_id: sole,
      pick_up_parent_id: sole,
      needs_grandparents_alert: false,
      can_select_assignments: false,
    }
  }

  // Two parents WFH: use stored if both ids are in wfhParents
  const storedDrop = stored?.drop_off_assigned_person_id && wfhParents.includes(stored.drop_off_assigned_person_id)
    ? stored.drop_off_assigned_person_id
    : null
  const storedPick = stored?.pick_up_assigned_person_id && wfhParents.includes(stored.pick_up_assigned_person_id)
    ? stored.pick_up_assigned_person_id
    : null
  const defaultId = wfhParents[0] ?? null
  return {
    drop_off_parent_id: storedDrop ?? defaultId,
    pick_up_parent_id: storedPick ?? defaultId,
    needs_grandparents_alert: false,
    can_select_assignments: true,
  }
}
