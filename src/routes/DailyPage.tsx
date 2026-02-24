import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useChores } from '../hooks/useChores'
import { useActivities } from '../hooks/useActivities'
import { usePeople } from '../hooks/usePeople'
import { useAllChoreAssignments } from '../hooks/useChores'
import { useAllocation } from '../hooks/useAllocation'
import { useSchoolRunTimes, useSchoolRunTimesMutations } from '../hooks/useSchoolRunTimes'
import { useSchoolActivitySlots } from '../hooks/useSchoolActivitySlots'
import { PersonFilter } from '../components/PersonFilter'
import { Avatar } from '../components/Avatar'
import { GrandparentsAlert } from '../components/GrandparentsAlert'
import { WhoDoingWhatCard } from '../components/WhoDoingWhatCard'
import { dayOfWeekToKey, DAY_LABELS } from '../lib/scheduleUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const allocation = useAllocation(selectedDay)
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

  const allocations = useMemo(() => ({ [selectedDay]: allocation }), [selectedDay, allocation])

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-4">Daily schedule</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-foreground">Daily schedule</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Label>Day</Label>
          <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <SelectItem key={d} value={String(d)}>{DAY_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PersonFilter people={people ?? []} selectedId={personFilterId} onChange={setPersonFilterId} />
          <Button asChild variant="secondary">
            <Link to="/schedule">Weekly view</Link>
          </Button>
        </div>
      </div>
      <div className="max-w-2xl space-y-4">
        {allocation.needs_grandparents_alert ? (
          <>
            <GrandparentsAlert dayLabel={DAY_LABELS[selectedDay]} />
            {parents.length >= 1 && (
              <WhoDoingWhatCard
                day={selectedDay}
                timesMap={timesMap}
                allocations={allocations}
                parents={parents}
                personName={personName}
                selectOpenDay={selectOpenDay}
                setSelectOpenDay={setSelectOpenDay}
                setDayAssignments={setDayAssignments.mutate}
              />
            )}
          </>
        ) : allocation.drop_off_parent_id != null || allocation.pick_up_parent_id != null ? (
          parents.length >= 1 && (
            <WhoDoingWhatCard
              day={selectedDay}
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
        <section>
          <h2 className="text-lg font-medium text-foreground mb-2">Today</h2>
          {sortedItems.length === 0 ? (
            <p className="text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-2">
              {sortedItems.map((entry) => {
                if (entry.type === 'chore') {
                  const c = entry.item
                  return (
                    <Card key={`chore-${c.id}`}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 min-h-[48px]">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <div className="flex items-center gap-2">
                          {(c.scheduled_time || c.time_of_day) && (
                            <span className="text-muted-foreground text-sm">
                              {c.scheduled_time ?? c.time_of_day}
                            </span>
                          )}
                          {(assignmentsMap[c.id] ?? []).length > 0 && (
                            <span className="flex flex-wrap gap-1.5 items-center">
                              {(assignmentsMap[c.id] ?? []).map((pid) => {
                                const p = (people ?? []).find((x) => x.id === pid)
                                return (
                                  <Badge key={pid} variant="secondary" className="inline-flex items-center gap-1 text-xs">
                                    <Avatar name={p?.name ?? ''} colorKey={p?.avatar_color} size="sm" />
                                    {personName(pid)}
                                  </Badge>
                                )
                              })}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
                const a = entry.item
                const person = (people ?? []).find((p) => p.id === a.person_id)
                const { cardBg, cardBorder } = getActivityCardStyles(person?.avatar_color)
                return (
                  <Card key={`activity-${a.id}`} className={`min-h-[48px] ${cardBg} ${cardBorder}`}>
                    <CardContent className="flex items-center justify-between p-3">
                      <span className="font-medium text-foreground">{a.name}</span>
                      <span className="text-muted-foreground">{a.start_time} – {a.end_time}</span>
                    </CardContent>
                  </Card>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
