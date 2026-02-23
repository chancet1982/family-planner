import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useChores } from '../hooks/useChores'
import { useActivities } from '../hooks/useActivities'
import { usePeople } from '../hooks/usePeople'
import { useAllChoreAssignments } from '../hooks/useChores'
import { useAllocation } from '../hooks/useAllocation'
import { useSchoolRunTimeForDay, useSchoolRunTimes, useSchoolRunTimesMutations } from '../hooks/useSchoolRunTimes'
import { useSchoolActivitySlots } from '../hooks/useSchoolActivitySlots'
import { PersonFilter } from '../components/PersonFilter'
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

function getTodayDayOfWeek(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export function DailyPage() {
  const [personFilterId, setPersonFilterId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(getTodayDayOfWeek)
  const [schoolBlockOpen, setSchoolBlockOpen] = useState(false)
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
  const allocation = useAllocation(selectedDay)
  const schoolRunTime = useSchoolRunTimeForDay(selectedDay)
  const { data: timesMap } = useSchoolRunTimes()
  const { setDayAssignments } = useSchoolRunTimesMutations()
  const parents = useMemo(() => (people ?? []).filter((p) => p.role === 'parent'), [people])

  const dayChores = useMemo(() => {
    const key = dayOfWeekToKey(selectedDay)
    return (chores ?? []).filter((c) => c.repeat_pattern[key]).filter((c) => {
      if (!personFilterId) return true
      return (assignmentsMap[c.id] ?? []).includes(personFilterId)
    })
  }, [chores, selectedDay, assignmentsMap, personFilterId])

  const dayActivities = useMemo(() => {
    return (activities ?? []).filter((a) => a.day_of_week === selectedDay).filter((a) => {
      if (!personFilterId) return true
      return a.person_id === personFilterId
    })
  }, [activities, selectedDay, personFilterId])

  const personName = (id: string) => (people ?? []).find((p) => p.id === id)?.name ?? ''

  const sortedItems = useMemo(() => {
    const chores = dayChores.map((c) => ({ type: 'chore' as const, item: c, sort: getSortMinutesChore(c) }))
    const activities = dayActivities.map((a) => ({ type: 'activity' as const, item: a, sort: getSortMinutesActivity(a) }))
    return [...chores, ...activities]
      .sort((a, b) => a.sort - b.sort)
      .map((x) => ({ type: x.type, item: x.item } as { type: 'chore'; item: Chore } | { type: 'activity'; item: ActivitySlot }))
  }, [dayChores, dayActivities])

  const loading = peopleLoading || choresLoading || activitiesLoading

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">Daily schedule</h1>
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Daily schedule</h1>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Day</label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>{DAY_LABELS[d]}</option>
            ))}
          </select>
          <PersonFilter people={people ?? []} selectedId={personFilterId} onChange={setPersonFilterId} />
          <Link
            to="/schedule"
            className="min-h-[44px] flex items-center px-4 rounded-xl bg-slate-200 text-slate-800 font-medium hover:bg-slate-300"
          >
            Weekly view
          </Link>
        </div>
      </div>
      <div className="max-w-2xl space-y-4">
        {allocation.needs_grandparents_alert ? (
          <>
            <GrandparentsAlert dayLabel={DAY_LABELS[selectedDay]} />
            {parents.length >= 1 && (
              <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
                {allocation.can_select_assignments && parents.length >= 2 ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800 font-medium">Who&apos;s doing what?</span>
                      <button
                        type="button"
                        onClick={() => setSchoolBlockOpen((o) => !o)}
                        className={`min-h-[36px] flex items-center justify-center rounded-lg border border-slate-400 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200 [&_svg]:shrink-0 ${
                          !schoolBlockOpen && timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null
                            ? 'min-w-[36px] p-2'
                            : 'py-2 px-3'
                        }`}
                        aria-label={schoolBlockOpen ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit assignments' : 'Select who does drop-off and pick-up')}
                        title={schoolBlockOpen ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit' : 'Select')}
                      >
                        {schoolBlockOpen ? (
                          'Close'
                        ) : timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        ) : (
                          'Select'
                        )}
                      </button>
                    </div>
                    {(timesMap?.[selectedDay]?.drop_off_assigned_person_id != null || timesMap?.[selectedDay]?.pick_up_assigned_person_id != null) && !schoolBlockOpen && (
                      <div className="text-slate-600 space-y-0.5">
                        {timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && (
                          <div>Drop-off {schoolRunTime.drop_off_time}: {personName(timesMap[selectedDay].drop_off_assigned_person_id!)}</div>
                        )}
                        {timesMap?.[selectedDay]?.pick_up_assigned_person_id != null && (
                          <div>Pick-up {schoolRunTime.pick_up_time}: {personName(timesMap[selectedDay].pick_up_assigned_person_id!)}</div>
                        )}
                      </div>
                    )}
                    {schoolBlockOpen && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-600">Drop-off {schoolRunTime.drop_off_time}</span>
                          <select
                            value={timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocation.drop_off_parent_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: selectedDay,
                              drop_off_assigned_person_id: e.target.value || null,
                              pick_up_assigned_person_id: timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocation.pick_up_parent_id ?? null,
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
                          <span className="text-xs text-slate-600">Pick-up {schoolRunTime.pick_up_time}</span>
                          <select
                            value={timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocation.pick_up_parent_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: selectedDay,
                              drop_off_assigned_person_id: timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocation.drop_off_parent_id ?? null,
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
                    {allocation.drop_off_parent_id != null && (
                      <div>Drop-off {schoolRunTime.drop_off_time}: {personName(allocation.drop_off_parent_id)}</div>
                    )}
                    {allocation.pick_up_parent_id != null && (
                      <div>Pick-up {schoolRunTime.pick_up_time}: {personName(allocation.pick_up_parent_id)}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : allocation.drop_off_parent_id != null || allocation.pick_up_parent_id != null ? (
          parents.length >= 1 && (
            <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
              {allocation.can_select_assignments && parents.length >= 2 ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-medium">Who&apos;s doing what?</span>
                    <button
                      type="button"
                      onClick={() => setSchoolBlockOpen((o) => !o)}
                      className={`min-h-[36px] flex items-center justify-center rounded-lg border border-slate-400 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200 [&_svg]:shrink-0 ${
                        !schoolBlockOpen && timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null
                          ? 'min-w-[36px] p-2'
                          : 'py-2 px-3'
                      }`}
                      aria-label={schoolBlockOpen ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit assignments' : 'Select who does drop-off and pick-up')}
                      title={schoolBlockOpen ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit' : 'Select')}
                    >
                      {schoolBlockOpen ? (
                        'Close'
                      ) : timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      ) : (
                        'Select'
                      )}
                    </button>
                  </div>
                  {(timesMap?.[selectedDay]?.drop_off_assigned_person_id != null || timesMap?.[selectedDay]?.pick_up_assigned_person_id != null) && !schoolBlockOpen && (
                    <div className="text-slate-600 space-y-0.5">
                      {timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && (
                        <div>Drop-off {schoolRunTime.drop_off_time}: {personName(timesMap[selectedDay].drop_off_assigned_person_id!)}</div>
                      )}
                      {timesMap?.[selectedDay]?.pick_up_assigned_person_id != null && (
                        <div>Pick-up {schoolRunTime.pick_up_time}: {personName(timesMap[selectedDay].pick_up_assigned_person_id!)}</div>
                      )}
                    </div>
                  )}
                  {schoolBlockOpen && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-600">Drop-off {schoolRunTime.drop_off_time}</span>
                        <select
                          value={timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocation.drop_off_parent_id ?? ''}
                          onChange={(e) => setDayAssignments.mutate({
                            day_of_week: selectedDay,
                            drop_off_assigned_person_id: e.target.value || null,
                            pick_up_assigned_person_id: timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocation.pick_up_parent_id ?? null,
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
                        <span className="text-xs text-slate-600">Pick-up {schoolRunTime.pick_up_time}</span>
                        <select
                          value={timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocation.pick_up_parent_id ?? ''}
                          onChange={(e) => setDayAssignments.mutate({
                            day_of_week: selectedDay,
                            drop_off_assigned_person_id: timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocation.drop_off_parent_id ?? null,
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
                  {allocation.drop_off_parent_id != null && (
                    <div>Drop-off {schoolRunTime.drop_off_time}: {personName(allocation.drop_off_parent_id)}</div>
                  )}
                  {allocation.pick_up_parent_id != null && (
                    <div>Pick-up {schoolRunTime.pick_up_time}: {personName(allocation.pick_up_parent_id)}</div>
                  )}
                </div>
              )}
            </div>
          )
        ) : null}
        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">Today</h2>
          {sortedItems.length === 0 ? (
            <p className="text-slate-500">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-2">
              {sortedItems.map((entry) => {
                if (entry.type === 'chore') {
                  const c = entry.item
                  return (
                    <li
                      key={`chore-${c.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl min-h-[48px]"
                    >
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <div className="flex items-center gap-2">
                        {(c.scheduled_time || c.time_of_day) && (
                          <span className="text-slate-500 text-sm">
                            {c.scheduled_time ?? c.time_of_day}
                          </span>
                        )}
                        {(assignmentsMap[c.id] ?? []).length > 0 && (
                          <span className="flex flex-wrap gap-1.5 items-center">
                            {(assignmentsMap[c.id] ?? []).map((pid) => {
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
                          </span>
                        )}
                      </div>
                    </li>
                  )
                }
                const a = entry.item
                const person = (people ?? []).find((p) => p.id === a.person_id)
                const { cardBg, cardBorder } = getActivityCardStyles(person?.avatar_color)
                return (
                  <li
                    key={`activity-${a.id}`}
                    className={`flex items-center justify-between p-3 border rounded-xl min-h-[48px] ${cardBg} ${cardBorder}`}
                  >
                    <span className="font-medium text-slate-900">{a.name}</span>
                    <span className="text-slate-600">{a.start_time} – {a.end_time}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
