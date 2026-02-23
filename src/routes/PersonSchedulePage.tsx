import { useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useChores } from '../hooks/useChores'
import { useActivities } from '../hooks/useActivities'
import { usePeople } from '../hooks/usePeople'
import { useAllChoreAssignments } from '../hooks/useChores'
import { useAllocationsForWeek } from '../hooks/useAllocation'
import { useSchoolRunTimes, useSchoolRunTimesMutations } from '../hooks/useSchoolRunTimes'
import { useSchoolActivitySlots } from '../hooks/useSchoolActivitySlots'
import { Avatar } from '../components/Avatar'
import { GrandparentsAlert } from '../components/GrandparentsAlert'
import { dayOfWeekToKey, DAY_LABELS } from '../lib/scheduleUtils'
import { parseTime } from '../lib/schoolRunUtils'
import { getActivityCardStyles } from '../lib/avatarColors'
import type { Chore } from '../types'
import type { ActivitySlot } from '../types'

const END_OF_DAY = 24 * 60
function getSortMinutesChore(c: Chore): number {
  if (c.scheduled_time) {
    const m = parseTime(c.scheduled_time)
    if (m != null) return m
  }
  return END_OF_DAY
}
function getSortMinutesActivity(a: ActivitySlot): number {
  const m = parseTime(a.start_time)
  return m != null ? m : END_OF_DAY
}

export function PersonSchedulePage() {
  const { personId } = useParams<{ personId: string }>()
  const [selectOpenDay, setSelectOpenDay] = useState<number | null>(null)
  const { data: people, isLoading: peopleLoading } = usePeople()
  const { data: chores, isLoading: choresLoading } = useChores()
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities()
  const schoolActivitySlots = useSchoolActivitySlots()
  const activities = useMemo(
    () => [...(activitiesData?.slots ?? []), ...schoolActivitySlots],
    [activitiesData?.slots, schoolActivitySlots]
  )
  const choreIds = (chores ?? []).map((c) => c.id)
  const { data: assignmentsMap = {} } = useAllChoreAssignments(choreIds)
  const allocations = useAllocationsForWeek()
  const { data: timesMap } = useSchoolRunTimes()
  const { setDayAssignments } = useSchoolRunTimesMutations()
  const parents = useMemo(() => (people ?? []).filter((p) => p.role === 'parent'), [people])

  const person = (people ?? []).find((p) => p.id === personId)
  const personFilterId = personId ?? null

  const choresByDay = useMemo(() => {
    const map: Record<number, typeof chores> = {}
    for (let d = 1; d <= 7; d++) {
      const key = dayOfWeekToKey(d)
      map[d] = (chores ?? []).filter((c) => c.repeat_pattern[key]).filter((c) => {
        if (!personFilterId) return true
        return (assignmentsMap[c.id] ?? []).includes(personFilterId)
      })
    }
    return map
  }, [chores, assignmentsMap, personFilterId])

  const activitiesByDay = useMemo(() => {
    const map: Record<number, typeof activities> = {}
    for (let d = 1; d <= 7; d++) {
      map[d] = (activities ?? []).filter((a) => a.day_of_week === d).filter((a) => {
        if (!personFilterId) return true
        return a.person_id === personFilterId
      })
    }
    return map
  }, [activities, personFilterId])

  const personName = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? ''

  const sortedDayItems = useMemo(() => {
    const map: Record<number, Array<{ type: 'chore'; item: Chore } | { type: 'activity'; item: ActivitySlot }>> = {}
    for (let d = 1; d <= 7; d++) {
      const chores = (choresByDay[d] ?? []).map((c) => ({ type: 'chore' as const, item: c, sort: getSortMinutesChore(c) }))
      const activities = (activitiesByDay[d] ?? []).map((a) => ({ type: 'activity' as const, item: a, sort: getSortMinutesActivity(a) }))
      const combined = [...chores, ...activities].sort((a, b) => a.sort - b.sort)
      map[d] = combined.map((x) => ({ type: x.type, item: x.item } as { type: 'chore'; item: Chore } | { type: 'activity'; item: ActivitySlot }))
    }
    return map
  }, [choresByDay, activitiesByDay])

  const loading = peopleLoading || choresLoading || activitiesLoading || choresLoading || activitiesLoading

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">Schedule</h1>
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!personId || !person) {
    return (
      <div>
        <p className="text-slate-600">Person not found.</p>
        <Link to="/schedule" className="text-slate-700 underline mt-2 inline-block">Back to schedule</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
        <h1 className="text-xl font-semibold text-slate-900">{person.name}&apos;s week</h1>
        <Link
          to="/schedule"
          className="min-h-[44px] flex items-center px-4 rounded-xl bg-slate-200 text-slate-800 font-medium hover:bg-slate-300"
        >
          View everyone
        </Link>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto grid-auto-rows-[1fr]">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <div
            key={d}
            className={`min-w-[140px] min-h-0 rounded-xl border p-3 flex flex-col gap-2 overflow-auto ${
              d >= 6 ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-2 shrink-0">
              {DAY_LABELS[d]}
            </div>
            {allocations[d]?.needs_grandparents_alert ? (
              <GrandparentsAlert dayLabel={DAY_LABELS[d]} />
            ) : allocations[d]?.drop_off_parent_id != null || allocations[d]?.pick_up_parent_id != null ? (
              parents.length >= 1 && (
                <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
                  {allocations[d]?.can_select_assignments && parents.length >= 2 ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-800 font-medium">Who&apos;s doing what?</span>
                        <button
                          type="button"
                          onClick={() => setSelectOpenDay((prev) => (prev === d ? null : d))}
                          className={`min-h-[36px] flex items-center justify-center rounded-lg border border-slate-400 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200 [&_svg]:shrink-0 ${
                            selectOpenDay !== d && timesMap?.[d]?.drop_off_assigned_person_id != null && timesMap?.[d]?.pick_up_assigned_person_id != null
                              ? 'min-w-[36px] p-2'
                              : 'py-2 px-3'
                          }`}
                          aria-label={selectOpenDay === d ? 'Close' : (timesMap?.[d]?.drop_off_assigned_person_id != null && timesMap?.[d]?.pick_up_assigned_person_id != null ? 'Edit assignments' : 'Select who does drop-off and pick-up')}
                          title={selectOpenDay === d ? 'Close' : (timesMap?.[d]?.drop_off_assigned_person_id != null && timesMap?.[d]?.pick_up_assigned_person_id != null ? 'Edit' : 'Select')}
                        >
                          {selectOpenDay === d ? (
                            'Close'
                          ) : timesMap?.[d]?.drop_off_assigned_person_id != null && timesMap?.[d]?.pick_up_assigned_person_id != null ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          ) : (
                            'Select'
                          )}
                        </button>
                      </div>
                      {(timesMap?.[d]?.drop_off_assigned_person_id != null || timesMap?.[d]?.pick_up_assigned_person_id != null) && selectOpenDay !== d && (
                        <div className="text-slate-600 space-y-0.5">
                          {timesMap?.[d]?.drop_off_assigned_person_id != null && (
                            <div>Drop-off {timesMap[d].drop_off_time}: {personName(timesMap[d].drop_off_assigned_person_id!)}</div>
                          )}
                          {timesMap?.[d]?.pick_up_assigned_person_id != null && (
                            <div>Pick-up {timesMap[d].pick_up_time}: {personName(timesMap[d].pick_up_assigned_person_id!)}</div>
                          )}
                        </div>
                      )}
                      {selectOpenDay === d && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-slate-600">Drop-off {timesMap?.[d]?.drop_off_time ?? '08:00'}</span>
                            <select
                              value={timesMap?.[d]?.drop_off_assigned_person_id ?? allocations[d]?.drop_off_parent_id ?? ''}
                              onChange={(e) => setDayAssignments.mutate({
                                day_of_week: d,
                                drop_off_assigned_person_id: e.target.value || null,
                                pick_up_assigned_person_id: timesMap?.[d]?.pick_up_assigned_person_id ?? allocations[d]?.pick_up_parent_id ?? null,
                              })}
                              className="text-xs min-h-[32px] px-2 rounded border border-slate-300 bg-white w-full"
                            >
                              <option value="">—</option>
                              {parents.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-slate-600">Pick-up {timesMap?.[d]?.pick_up_time ?? '15:00'}</span>
                            <select
                              value={timesMap?.[d]?.pick_up_assigned_person_id ?? allocations[d]?.pick_up_parent_id ?? ''}
                              onChange={(e) => setDayAssignments.mutate({
                                day_of_week: d,
                                drop_off_assigned_person_id: timesMap?.[d]?.drop_off_assigned_person_id ?? allocations[d]?.drop_off_parent_id ?? null,
                                pick_up_assigned_person_id: e.target.value || null,
                              })}
                              className="text-xs min-h-[32px] px-2 rounded border border-slate-300 bg-white w-full"
                            >
                              <option value="">—</option>
                              {parents.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-600 space-y-0.5">
                      {allocations[d]?.drop_off_parent_id != null && (
                        <div>Drop-off {timesMap?.[d]?.drop_off_time ?? '08:00'}: {personName(allocations[d].drop_off_parent_id)}</div>
                      )}
                      {allocations[d]?.pick_up_parent_id != null && (
                        <div>Pick-up {timesMap?.[d]?.pick_up_time ?? '15:00'}: {personName(allocations[d].pick_up_parent_id)}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : null}
            {(sortedDayItems[d] ?? []).map((entry) =>
              entry.type === 'chore' ? (
                <div
                  key={`chore-${entry.item.id}`}
                  className="text-sm p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <span className="font-medium text-slate-800">{entry.item.name}</span>
                  {(entry.item.scheduled_time || entry.item.time_of_day) && (
                    <span className="text-slate-500 ml-1">
                      {entry.item.scheduled_time ? entry.item.scheduled_time : `(${entry.item.time_of_day})`}
                    </span>
                  )}
                  {(assignmentsMap[entry.item.id] ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                      {(assignmentsMap[entry.item.id] ?? []).map((pid) => {
                        const p = (people ?? []).find((x) => x.id === pid)
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700"
                          >
                            <Avatar name={p?.name ?? ''} colorKey={p?.avatar_color} size="sm" />
                            {personName(pid)}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (() => {
                const person = (people ?? []).find((p) => p.id === entry.item.person_id)
                const { cardBg, cardBorder } = getActivityCardStyles(person?.avatar_color)
                return (
                  <div
                    key={`activity-${entry.item.id}`}
                    className={`text-sm p-2 rounded-lg border ${cardBg} ${cardBorder}`}
                  >
                    <span className="font-medium text-slate-800">{entry.item.name}</span>
                    <span className="text-slate-500 block">{entry.item.start_time} – {entry.item.end_time}</span>
                  </div>
                )
              })()
            )}
            {(sortedDayItems[d] ?? []).length === 0 && !allocations[d]?.needs_grandparents_alert && (
              <p className="text-sm text-slate-400">Nothing scheduled</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
