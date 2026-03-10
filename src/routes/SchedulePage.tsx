import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useChores } from '../hooks/useChores'
import { useActivities } from '../hooks/useActivities'
import { usePeople } from '../hooks/usePeople'
import { useAllChoreAssignments } from '../hooks/useChores'
import { useAllocationsForWeek } from '../hooks/useAllocation'
import { useSchoolRunTimes, useSchoolRunTimesMutations } from '../hooks/useSchoolRunTimes'
import { useSchoolActivitySlots } from '../hooks/useSchoolActivitySlots'
import { useGymnastics } from '../hooks/useGymnastics'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const children = useMemo(() => (people ?? []).filter((p) => p.role === 'child'), [people])
  const { data: gymnasticsList } = useGymnastics()

  const gymnasticsByDay = useMemo(() => {
    const map: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
    ;(gymnasticsList ?? []).forEach((g) => {
      if (g.day_of_week >= 1 && g.day_of_week <= 5) {
        map[g.day_of_week].push(g.person_id)
      }
    })
    return map
  }, [gymnasticsList])

  const choresByDay = useMemo(() => {
    const map: Record<number, Chore[]> = {}

    for (let d = 1; d <= 7; d++) {
      const key = dayOfWeekToKey(d)

      const base = (chores ?? []).filter((c) => c.repeat_pattern[key])

      const baseFiltered = base.filter((c) => {
        if (!personFilterId) return true
        return (assignmentsMap[c.id] ?? []).includes(personFilterId)
      })

      const gymChores: Chore[] = []
      if (d >= 1 && d <= 5) {
        const childIdsForDay = gymnasticsByDay[d] ?? []
        for (const child of children) {
          if (!childIdsForDay.includes(child.id)) continue
          if (personFilterId && personFilterId !== child.id) continue

          const baseChoreFields = {
            household_id: '',
            repeat_pattern: {},
            time_of_day: null as string | null,
            created_at: undefined,
            updated_at: undefined,
          }

          gymChores.push({
            id: `gym-pack-${child.id}-${d}`,
            name: 'Pack gymnastics bag',
            scheduled_time: '07:30',
            ...baseChoreFields,
          } as Chore)

          gymChores.push({
            id: `gym-empty-${child.id}-${d}`,
            name: 'Empty gymnastics bag',
            scheduled_time: '19:30',
            ...baseChoreFields,
          } as Chore)
        }
      }

      map[d] = [...baseFiltered, ...gymChores]
    }

    return map
  }, [chores, assignmentsMap, personFilterId, gymnasticsByDay, children])

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
        <h1 className="text-xl font-semibold text-foreground mb-4">Weekly schedule</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!hasPeople) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-4">Weekly schedule</h1>
        <Card className="p-6 text-center">
          <CardContent className="p-0">
            <p className="mb-2 text-muted-foreground">Add family members in Admin → People to get started.</p>
            <Button asChild variant="link" className="text-foreground font-medium">
              <Link to="/admin">Go to Admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasAny) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-foreground">Weekly schedule</h1>
          <PersonFilter people={people ?? []} selectedId={personFilterId} onChange={setPersonFilterId} />
        </div>
        <Card className="p-6 text-center">
          <CardContent className="p-0">
            <p className="mb-2 text-muted-foreground">No chores or activities yet. Add them in Admin to see your week here.</p>
            <Button asChild variant="link" className="text-foreground font-medium">
              <Link to="/admin">Go to Admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
        <Tabs value={viewMode} onValueChange={(v) => setView(v as 'week' | 'day')} className="w-auto self-stretch flex flex-col">
          <TabsList role="group" aria-label="View mode" className="rounded-lg h-full">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-4">
          <PersonFilter
            people={people ?? []}
            selectedId={personFilterId}
            onChange={setPersonFilterId}
          />
          {personFilterId && viewMode === 'week' && (
            <Button asChild>
              <Link to={`/schedule/person/${personFilterId}`}>
                View {personName(personFilterId)}&apos;s week
              </Link>
            </Button>
          )}
        </div>
      </div>
      {viewMode === 'day' ? (
        <Card className="min-w-[140px] max-w-2xl min-h-0 flex flex-col gap-2 overflow-auto animate-fade-in-up">
          <CardContent className="p-3 flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 shrink-0">
              <div className="font-semibold text-foreground">{DAY_LABELS[selectedDay]}</div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Day</Label>
                <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>{DAY_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {allocations[selectedDay]?.needs_grandparents_alert ? (
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
          ) : allocations[selectedDay]?.drop_off_parent_id != null || allocations[selectedDay]?.pick_up_parent_id != null ? (
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
            {(sortedDayItems[selectedDay] ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
            ) : (
              <ul className="space-y-2">
                {(sortedDayItems[selectedDay] ?? []).map((entry, i) =>
                  entry.type === 'chore' ? (
                    <Card
                      key={`chore-${entry.item.id}`}
                      className="animate-fade-in-up transition-all duration-200"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <CardContent className="text-sm p-2">
                        <span className="font-medium text-foreground">{entry.item.name}</span>
                        {(entry.item.scheduled_time || entry.item.time_of_day) && (
                          <span className="text-muted-foreground ml-1">{entry.item.scheduled_time ? entry.item.scheduled_time : `(${entry.item.time_of_day})`}</span>
                        )}
                        {(assignmentsMap[entry.item.id] ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                            {(assignmentsMap[entry.item.id] ?? []).map((pid) => (
                              <Badge key={pid} variant="secondary" className="inline-flex items-center gap-1">
                                <Avatar name={(people ?? []).find((x) => x.id === pid)?.name ?? ''} colorKey={(people ?? []).find((x) => x.id === pid)?.avatar_color} size="sm" />
                                {personName(pid)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (() => {
                    const person = (people ?? []).find((p) => p.id === entry.item.person_id)
                    const { cardBg, cardBorder } = getActivityCardStyles(person?.avatar_color)
                    return (
                      <Card
                        key={`activity-${entry.item.id}`}
                        className={`text-sm animate-fade-in-up transition-all duration-200 ${cardBg} ${cardBorder}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <CardContent className="p-2">
                          <span className="font-medium text-foreground">{entry.item.name}</span>
                          <span className="text-muted-foreground block">
                            {entry.item.start_time} – {entry.item.end_time}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {person?.name ?? personName(entry.item.person_id)}
                          </span>
                        </CardContent>
                      </Card>
                    )
                  })()
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
      <div className="flex-1 min-h-0 overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-3 min-w-[1400px]">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Card
              key={d}
              className={`min-h-0 flex flex-col gap-2 overflow-auto animate-fade-in-up ${d >= 6 ? 'bg-muted/50' : ''}`}
              style={{ animationDelay: `${(d - 1) * 35}ms` }}
            >
              <CardContent className="p-3 flex flex-col gap-2 flex-1 min-h-0">
                <div className="font-semibold text-foreground border-b border-border pb-2 shrink-0">
                  {DAY_LABELS[d]}
                </div>
                {allocations[d]?.needs_grandparents_alert ? (
                  <>
                    <GrandparentsAlert dayLabel={DAY_LABELS[d]} />
                    {parents.length >= 1 && (
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
                    )}
                  </>
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
                {(sortedDayItems[d] ?? []).map((entry, i) =>
                  entry.type === 'chore' ? (
                    <div
                      key={`chore-${entry.item.id}`}
                      className="text-sm p-2 rounded-lg bg-muted/30 border border-border animate-fade-in-up transition-colors duration-150"
                      style={{ animationDelay: `${i * 25}ms` }}
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
                    const person = (people ?? []).find((p) => p.id === entry.item.person_id)
                    const { cardBg, cardBorder } = getActivityCardStyles(person?.avatar_color)
                    return (
                      <div
                        key={`activity-${entry.item.id}`}
                        className={`text-sm p-2 rounded-lg border animate-fade-in-up transition-colors duration-150 ${cardBg} ${cardBorder}`}
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <span className="font-medium text-foreground">{entry.item.name}</span>
                        <span className="text-muted-foreground block">
                          {entry.item.start_time} – {entry.item.end_time}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {person?.name ?? personName(entry.item.person_id)}
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
      )}
    </div>
  )
}
