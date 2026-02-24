import { useState, useEffect } from 'react'
import { useSchoolRuns, useSchoolRunMutations } from '../../hooks/useSchoolRuns'
import { useSchoolRunTimes, useSchoolRunTimesMutations, DAY_LABELS } from '../../hooks/useSchoolRunTimes'
import { useActivities } from '../../hooks/useActivities'
import { suggestedPickupForDay, parseTime } from '../../lib/schoolRunUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Weekdays only (no school on weekends). */
const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const
const DEFAULT_DROP = '08:00'
const DEFAULT_PICKUP = '15:00'

export function AdminSchoolRuns() {
  const { data: schoolRun, isLoading, error } = useSchoolRuns()
  const { data: timesMap, isLoading: timesLoading } = useSchoolRunTimes()
  const { data: activitiesData } = useActivities()
  const activitySlots = activitiesData?.slots ?? []
  const { upsertLabel } = useSchoolRunMutations()
  const { upsertAllDays } = useSchoolRunTimesMutations()
  const [label, setLabel] = useState('School')
  const [dayTimes, setDayTimes] = useState<Record<number, { drop_off_time: string; pick_up_time: string }>>({})

  useEffect(() => {
    if (schoolRun) setLabel(schoolRun.label)
  }, [schoolRun])

  useEffect(() => {
    const next: Record<number, { drop_off_time: string; pick_up_time: string }> = {}
    const legacyDrop = schoolRun?.drop_off_time ?? DEFAULT_DROP
    const legacyPickup = schoolRun?.pick_up_time ?? DEFAULT_PICKUP
    for (const d of SCHOOL_DAYS) {
      const row = timesMap?.[d]
      next[d] = {
        drop_off_time: row?.drop_off_time ?? legacyDrop,
        pick_up_time: row?.pick_up_time ?? legacyPickup,
      }
    }
    setDayTimes(next)
  }, [timesMap, schoolRun?.drop_off_time, schoolRun?.pick_up_time])

  const activitiesByDay: Record<number, { start_time: string }[]> = {}
  for (const d of SCHOOL_DAYS) {
    activitiesByDay[d] = activitySlots.filter((a) => a.day_of_week === d)
  }

  const handleSaveLabel = (e: React.FormEvent) => {
    e.preventDefault()
    upsertLabel.mutate({ label })
  }

  const handleSaveTimes = (e: React.FormEvent) => {
    e.preventDefault()
    const days = SCHOOL_DAYS.map((d) => ({
      day_of_week: d,
      drop_off_time: dayTimes[d]?.drop_off_time ?? DEFAULT_DROP,
      pick_up_time: dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP,
    }))
    upsertAllDays.mutate(days)
  }

  if (isLoading || timesLoading) {
    return (
      <section aria-labelledby="admin-school-heading">
        <h2 id="admin-school-heading" className="text-lg font-medium text-foreground mb-4">School times</h2>
        <p className="text-muted-foreground">Loading…</p>
      </section>
    )
  }
  if (error) {
    return (
      <section aria-labelledby="admin-school-heading">
        <h2 id="admin-school-heading" className="text-lg font-medium text-foreground mb-4">School times</h2>
        <Alert variant="destructive" role="alert">
          <AlertDescription>Failed to load school times.</AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <section aria-labelledby="admin-school-heading" className="animate-fade-in-up">
      <h2 id="admin-school-heading" className="text-lg font-medium text-foreground mb-4">
        School times
      </h2>
      <p className="text-muted-foreground mb-4">
        Set drop-off and pick-up times per day. Pick-up should be 45 minutes before the first child activity.
      </p>

      <form onSubmit={handleSaveLabel} className="max-w-md space-y-2 mb-6">
        <Label htmlFor="school-label">Label</Label>
        <div className="flex gap-2">
          <Input
            id="school-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. School"
            className="flex-1"
          />
          <Button type="submit" disabled={upsertLabel.isPending}>
            {upsertLabel.isPending ? 'Saving…' : 'Save label'}
          </Button>
        </div>
      </form>

      <form onSubmit={handleSaveTimes} className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Drop-off</TableHead>
              <TableHead>Pick-up</TableHead>
              <TableHead className="text-sm">Hint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SCHOOL_DAYS.map((d, index) => {
              const suggested = suggestedPickupForDay(activitiesByDay[d] ?? [])
              const currentPickup = dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP
              const suggestedMins = suggested ? parseTime(suggested) : null
              const currentMins = parseTime(currentPickup)
              const pickupOk =
                !suggestedMins ||
                (currentMins != null && currentMins <= suggestedMins)
              return (
                <TableRow
                  key={d}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                >
                  <TableCell className="font-medium">{DAY_LABELS[d]}</TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={dayTimes[d]?.drop_off_time ?? DEFAULT_DROP}
                      onChange={(e) =>
                        setDayTimes((prev) => ({
                          ...prev,
                          [d]: { ...prev[d], drop_off_time: e.target.value, pick_up_time: prev[d]?.pick_up_time ?? DEFAULT_PICKUP },
                        }))
                      }
                      className="w-full max-w-[120px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={dayTimes[d]?.pick_up_time ?? DEFAULT_PICKUP}
                      onChange={(e) =>
                        setDayTimes((prev) => ({
                          ...prev,
                          [d]: { drop_off_time: prev[d]?.drop_off_time ?? DEFAULT_DROP, pick_up_time: e.target.value },
                        }))
                      }
                      className={`w-full max-w-[120px] ${!pickupOk ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
                      title={suggested ? `Pick-up 45 min before first activity (by ${suggested})` : undefined}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {suggested ? (
                      <span className={pickupOk ? '' : 'text-amber-600 dark:text-amber-400'}>
                        First activity → pick-up by {suggested}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">No activities</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {upsertAllDays.isError && (
          <Alert variant="destructive" className="mt-2" role="alert">
            <AlertDescription>{(upsertAllDays.error as Error).message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={upsertAllDays.isPending} className="mt-4">
          {upsertAllDays.isPending ? 'Saving…' : 'Save times'}
        </Button>
      </form>
    </section>
  )
}
