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
import { WhoDoingWhatCard } from '../components/WhoDoingWhatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
        <h1 className="text-xl font-semibold text-foreground mb-4">Schedule</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!personId || !person) {
    return (
      <div>
        <p className="text-muted-foreground">Person not found.</p>
        <Button asChild variant="link" className="mt-2 p-0 h-auto">
          <Link to="/schedule">Back to schedule</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
        <h1 className="text-xl font-semibold text-foreground">{person.name}&apos;s week</h1>
        <Button asChild variant="secondary">
          <Link to="/schedule">View everyone</Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto grid-auto-rows-[1fr]">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Card
            key={d}
            className={`min-w-[140px] min-h-0 flex flex-col gap-2 overflow-auto ${d >= 6 ? 'bg-muted/50' : ''}`}
          >
            <CardContent className="p-3 flex flex-col gap-2 flex-1 min-h-0">
              <div className="font-semibold text-foreground border-b border-border pb-2 shrink-0">
                {DAY_LABELS[d]}
              </div>
              {allocations[d]?.needs_grandparents_alert ? (
                <GrandparentsAlert dayLabel={DAY_LABELS[d]} />
              ) : allocations[d]?.drop_off_parent_id != null || allocations[d]?.pick_up_parent_id != null ? (
                parents.length >= 1 && (
                  <WhoDoingWhatCard
                    day={d}
                    timesMap={timesMap}
                    allocations={allocations}
                    parents={parents}
                    personName={personName}
                    selectOpenDay={selectOpenDay}
                    setSelectOpenDay={setSelectOpenDay}
                    setDayAssignments={setDayAssignments.mutate}
                  />
                )
              ) : null}
              {(sortedDayItems[d] ?? []).map((entry) =>
                entry.type === 'chore' ? (
                  <div
                    key={`chore-${entry.item.id}`}
                    className="text-sm p-2 rounded-lg bg-muted/30 border border-border"
                  >
                    <span className="font-medium text-foreground">{entry.item.name}</span>
                    {(entry.item.scheduled_time || entry.item.time_of_day) && (
                      <span className="text-muted-foreground ml-1">
                        {entry.item.scheduled_time ? entry.item.scheduled_time : `(${entry.item.time_of_day})`}
                      </span>
                    )}
                    {(assignmentsMap[entry.item.id] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                        {(assignmentsMap[entry.item.id] ?? []).map((pid) => {
                          const p = (people ?? []).find((x) => x.id === pid)
                          return (
                            <Badge key={pid} variant="secondary" className="inline-flex items-center gap-1 text-xs">
                              <Avatar name={p?.name ?? ''} colorKey={p?.avatar_color} size="sm" />
                              {personName(pid)}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const personObj = (people ?? []).find((p) => p.id === entry.item.person_id)
                  const { cardBg, cardBorder } = getActivityCardStyles(personObj?.avatar_color)
                  return (
                    <div
                      key={`activity-${entry.item.id}`}
                      className={`text-sm p-2 rounded-lg border ${cardBg} ${cardBorder}`}
                    >
                      <span className="font-medium text-foreground">{entry.item.name}</span>
                      <span className="text-muted-foreground block">
                        {entry.item.start_time} – {entry.item.end_time}
                      </span>
                    </div>
                  )
                })()
              )}
              {(sortedDayItems[d] ?? []).length === 0 && !allocations[d]?.needs_grandparents_alert && (
                <p className="text-sm text-muted-foreground">Nothing scheduled</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
