import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useChores } from '../hooks/useChores'
import { useActivities } from '../hooks/useActivities'
import { usePeople } from '../hooks/usePeople'
import { useAllChoreAssignments } from '../hooks/useChores'
import { useAllocationsForWeek } from '../hooks/useAllocation'
import { useSchoolRunTimes, useSchoolRunTimesMutations } from '../hooks/useSchoolRunTimes'
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

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const [viewMode, setViewMode] = useState<'week' | 'day'>(viewParam === 'day' ? 'day' : 'week')
  const [selectedDay, setSelectedDay] = useState(getTodayDayOfWeek)
  const [personFilterId, setPersonFilterId] = useState<string | null>(null)
  /** Day (1–7) for which "Who's doing what?" select form is open (when no parent WFH). */
  const [selectOpenDay, setSelectOpenDay] = useState<number | null>(null)
  const { data: people, isLoading: peopleLoading } = usePeople()

  useEffect(() => {
    setViewMode(viewParam === 'day' ? 'day' : 'week')
  }, [viewParam])

  const setView = (mode: 'week' | 'day') => {
    setViewMode(mode)
    if (mode === 'day') setSearchParams({ view: 'day' })
    else setSearchParams({})
  }
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

  /** Per-day list of chores and activities sorted by time (then chores without time, then activities without time). */
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

  const loading = peopleLoading || choresLoading || activitiesLoading
  const hasAny = (chores ?? []).length > 0 || (activities ?? []).length > 0
  const hasPeople = (people ?? []).length > 0

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">Weekly schedule</h1>
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!hasPeople) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-4">Weekly schedule</h1>
        <div className="rounded-xl bg-slate-100 border border-slate-200 p-6 text-center text-slate-600">
          <p className="mb-2">Add family members in Admin → People to get started.</p>
          <Link to="/admin" className="text-slate-800 font-medium underline">Go to Admin</Link>
        </div>
      </div>
    )
  }

  if (!hasAny) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Weekly schedule</h1>
          <PersonFilter people={people ?? []} selectedId={personFilterId} onChange={setPersonFilterId} />
        </div>
        <div className="rounded-xl bg-slate-100 border border-slate-200 p-6 text-center text-slate-600">
          <p className="mb-2">No chores or activities yet. Add them in Admin to see your week here.</p>
          <Link to="/admin" className="text-slate-800 font-medium underline">Go to Admin</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
        <h1 className="text-xl font-semibold text-slate-900">{viewMode === 'week' ? 'Weekly schedule' : 'Daily schedule'}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 gap-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setView('week')}
              className={`min-h-[40px] px-4 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={viewMode === 'week'}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('day')}
              className={`min-h-[40px] px-4 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={viewMode === 'day'}
            >
              Day
            </button>
          </div>
          <PersonFilter
            people={people ?? []}
            selectedId={personFilterId}
            onChange={setPersonFilterId}
          />
          {personFilterId && viewMode === 'week' && (
            <Link
              to={`/schedule/person/${personFilterId}`}
              className="min-h-[44px] flex items-center px-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700"
            >
              View {personName(personFilterId)}&apos;s week
            </Link>
          )}
        </div>
      </div>
      {viewMode === 'day' ? (
        <div className="flex flex-col gap-4 max-w-2xl">
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
          </div>
          {allocations[selectedDay]?.needs_grandparents_alert ? (
            <>
              <GrandparentsAlert dayLabel={DAY_LABELS[selectedDay]} />
              {parents.length >= 1 && (
                <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-800 font-medium">Who&apos;s doing what?</span>
                    <button
                      type="button"
                      onClick={() => setSelectOpenDay((prev) => (prev === selectedDay ? null : selectedDay))}
                      className={`min-h-[36px] flex items-center justify-center rounded-lg border border-slate-400 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200 [&_svg]:shrink-0 ${
                        selectOpenDay !== selectedDay && timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null
                          ? 'min-w-[36px] p-2'
                          : 'py-2 px-3'
                      }`}
                      aria-label={selectOpenDay === selectedDay ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit assignments' : 'Select who does drop-off and pick-up')}
                      title={selectOpenDay === selectedDay ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit' : 'Select')}
                    >
                      {selectOpenDay === selectedDay ? (
                        'Close'
                      ) : timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      ) : (
                        'Select'
                      )}
                    </button>
                  </div>
                  {(timesMap?.[selectedDay]?.drop_off_assigned_person_id != null || timesMap?.[selectedDay]?.pick_up_assigned_person_id != null) && selectOpenDay !== selectedDay && (
                    <div className="text-slate-600 space-y-0.5">
                      {timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && (
                        <div>Drop-off {timesMap[selectedDay].drop_off_time}: {personName(timesMap[selectedDay].drop_off_assigned_person_id!)}</div>
                      )}
                      {timesMap?.[selectedDay]?.pick_up_assigned_person_id != null && (
                        <div>Pick-up {timesMap[selectedDay].pick_up_time}: {personName(timesMap[selectedDay].pick_up_assigned_person_id!)}</div>
                      )}
                    </div>
                  )}
                  {selectOpenDay === selectedDay && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-600">Drop-off {timesMap?.[selectedDay]?.drop_off_time ?? '08:00'}</span>
                        <select
                          value={timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? ''}
                          onChange={(e) => setDayAssignments.mutate({
                            day_of_week: selectedDay,
                            drop_off_assigned_person_id: e.target.value || null,
                            pick_up_assigned_person_id: timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? null,
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
                        <span className="text-xs text-slate-600">Pick-up {timesMap?.[selectedDay]?.pick_up_time ?? '15:00'}</span>
                        <select
                          value={timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? ''}
                          onChange={(e) => setDayAssignments.mutate({
                            day_of_week: selectedDay,
                            drop_off_assigned_person_id: timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? null,
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
                </div>
              )}
            </>
          ) : allocations[selectedDay]?.drop_off_parent_id != null || allocations[selectedDay]?.pick_up_parent_id != null ? (
            parents.length >= 1 && (
              <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
                {allocations[selectedDay]?.can_select_assignments && parents.length >= 2 ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800 font-medium">Who&apos;s doing what?</span>
                      <button
                        type="button"
                        onClick={() => setSelectOpenDay((prev) => (prev === selectedDay ? null : selectedDay))}
                        className={`min-h-[36px] flex items-center justify-center rounded-lg border border-slate-400 bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200 [&_svg]:shrink-0 ${
                          selectOpenDay !== selectedDay && timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null
                            ? 'min-w-[36px] p-2'
                            : 'py-2 px-3'
                        }`}
                        aria-label={selectOpenDay === selectedDay ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit assignments' : 'Select who does drop-off and pick-up')}
                        title={selectOpenDay === selectedDay ? 'Close' : (timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? 'Edit' : 'Select')}
                      >
                        {selectOpenDay === selectedDay ? (
                          'Close'
                        ) : timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && timesMap?.[selectedDay]?.pick_up_assigned_person_id != null ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        ) : (
                          'Select'
                        )}
                      </button>
                    </div>
                    {(timesMap?.[selectedDay]?.drop_off_assigned_person_id != null || timesMap?.[selectedDay]?.pick_up_assigned_person_id != null) && selectOpenDay !== selectedDay && (
                      <div className="text-slate-600 space-y-0.5">
                        {timesMap?.[selectedDay]?.drop_off_assigned_person_id != null && (
                          <div>Drop-off {timesMap[selectedDay].drop_off_time}: {personName(timesMap[selectedDay].drop_off_assigned_person_id!)}</div>
                        )}
                        {timesMap?.[selectedDay]?.pick_up_assigned_person_id != null && (
                          <div>Pick-up {timesMap[selectedDay].pick_up_time}: {personName(timesMap[selectedDay].pick_up_assigned_person_id!)}</div>
                        )}
                      </div>
                    )}
                    {selectOpenDay === selectedDay && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-600">Drop-off {timesMap?.[selectedDay]?.drop_off_time ?? '08:00'}</span>
                          <select
                            value={timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocations[selectedDay]?.drop_off_parent_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: selectedDay,
                              drop_off_assigned_person_id: e.target.value || null,
                              pick_up_assigned_person_id: timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocations[selectedDay]?.pick_up_parent_id ?? null,
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
                          <span className="text-xs text-slate-600">Pick-up {timesMap?.[selectedDay]?.pick_up_time ?? '15:00'}</span>
                          <select
                            value={timesMap?.[selectedDay]?.pick_up_assigned_person_id ?? allocations[selectedDay]?.pick_up_parent_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: selectedDay,
                              drop_off_assigned_person_id: timesMap?.[selectedDay]?.drop_off_assigned_person_id ?? allocations[selectedDay]?.drop_off_parent_id ?? null,
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
                    {allocations[selectedDay]?.drop_off_parent_id != null && (
                      <div>Drop-off {timesMap?.[selectedDay]?.drop_off_time ?? '08:00'}: {personName(allocations[selectedDay].drop_off_parent_id)}</div>
                    )}
                    {allocations[selectedDay]?.pick_up_parent_id != null && (
                      <div>Pick-up {timesMap?.[selectedDay]?.pick_up_time ?? '15:00'}: {personName(allocations[selectedDay].pick_up_parent_id)}</div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : null}
          <section>
            <h2 className="text-lg font-medium text-slate-800 mb-2">{DAY_LABELS[selectedDay]}</h2>
            {(sortedDayItems[selectedDay] ?? []).length === 0 ? (
              <p className="text-slate-500">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {(sortedDayItems[selectedDay] ?? []).map((entry) =>
                  entry.type === 'chore' ? (
                    <div key={`chore-${entry.item.id}`} className="text-sm p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-800">{entry.item.name}</span>
                      {(entry.item.scheduled_time || entry.item.time_of_day) && (
                        <span className="text-slate-500 ml-1">{entry.item.scheduled_time ? entry.item.scheduled_time : `(${entry.item.time_of_day})`}</span>
                      )}
                      {(assignmentsMap[entry.item.id] ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                          {(assignmentsMap[entry.item.id] ?? []).map((pid) => {
                            const p = (people ?? []).find((x) => x.id === pid)
                            return (
                              <span key={pid} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
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
                      <div key={`activity-${entry.item.id}`} className={`text-sm p-2 rounded-lg border ${cardBg} ${cardBorder}`}>
                        <span className="font-medium text-slate-800">{entry.item.name}</span>
                        <span className="text-slate-500 block">{entry.item.start_time} – {entry.item.end_time}</span>
                      </div>
                    )
                  })()
                )}
              </ul>
            )}
          </section>
        </div>
      ) : (
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
              <>
                <GrandparentsAlert dayLabel={DAY_LABELS[d]} />
                {parents.length >= 1 && (
                  <div className="text-sm rounded-lg bg-white border border-slate-300 px-2 py-1.5 space-y-1.5 mt-2 shadow-sm">
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
                            value={timesMap?.[d]?.drop_off_assigned_person_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: d,
                              drop_off_assigned_person_id: e.target.value || null,
                              pick_up_assigned_person_id: timesMap?.[d]?.pick_up_assigned_person_id ?? null,
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
                            value={timesMap?.[d]?.pick_up_assigned_person_id ?? ''}
                            onChange={(e) => setDayAssignments.mutate({
                              day_of_week: d,
                              drop_off_assigned_person_id: timesMap?.[d]?.drop_off_assigned_person_id ?? null,
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
                  </div>
                )}
              </>
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
      )}
    </div>
  )
}
