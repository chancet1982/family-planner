export type PersonRole = 'parent' | 'child'

export interface Household {
  id: string
  name: string
  invite_code: string | null
  created_at?: string
  updated_at?: string
}

export type AvatarColorKey =
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'emerald'
  | 'orange'
  | 'indigo'
  | 'teal'

export interface Person {
  id: string
  household_id: string
  name: string
  email: string | null
  role: PersonRole
  display_order: number
  avatar_color?: AvatarColorKey
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface Chore {
  id: string
  household_id: string
  name: string
  repeat_pattern: Record<string, boolean> // mon, tue, ... sun
  time_of_day: string | null // e.g. morning, evening
  scheduled_time: string | null // HH:mm specific time
  created_at?: string
  updated_at?: string
}

export interface ChoreAssignment {
  chore_id: string
  person_id: string
  created_at?: string
}

/** Logical activity (name + person). Actual times are in activity_occurrences. */
export interface Activity {
  id: string
  household_id: string
  name: string
  person_id: string
  created_at?: string
  updated_at?: string
}

/** One (day, start, end) slot for an activity. An activity can have many occurrences per week. */
export interface ActivityOccurrence {
  id: string
  activity_id: string
  day_of_week: number // 1-7
  start_time: string // HH:mm
  end_time: string
  drop_off_mode?: 'parent' | 'grandparents' | 'alone'
  pick_up_mode?: 'parent' | 'grandparents' | 'alone'
  drop_off_parent_id?: string | null
  pick_up_parent_id?: string | null
  created_at?: string
  updated_at?: string
}

/** Flattened slot for schedule display: activity + one occurrence. */
export interface ActivitySlot {
  id: string // occurrence id (unique per slot)
  activity_id: string
  name: string
  person_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface WorkFromHome {
  id: string
  person_id: string
  day_of_week: number // 1-7
  start_time: string | null
  end_time: string | null
  created_at?: string
  updated_at?: string
}

export interface GymnasticsSchedule {
  id: string
  person_id: string
  day_of_week: number // 1-5 (Mon–Fri)
  created_at?: string
  updated_at?: string
}

export interface SchoolRun {
  id: string
  household_id: string
  drop_off_time: string | null
  pick_up_time: string | null
  label: string
  created_at?: string
  updated_at?: string
}

export interface SchoolRunTime {
  id: string
  household_id: string
  day_of_week: number
  drop_off_time: string
  pick_up_time: string
  drop_off_assigned_person_id?: string | null
  pick_up_assigned_person_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface AllocationResult {
  drop_off_parent_id: string | null
  pick_up_parent_id: string | null
  needs_grandparents_alert: boolean
  /** True when both parents WFH so user can choose who does drop-off vs pick-up */
  can_select_assignments: boolean
}

export interface Profile {
  id: string
  household_id: string | null
  role: PersonRole
  created_at?: string
  updated_at?: string
}
